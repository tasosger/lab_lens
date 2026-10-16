import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type SVGProps } from 'react'
import { cameraAfterDrag, cameraAfterPan, cameraAfterWheel, cameraAtZoom, DEFAULT_ORBIT_CAMERA, interpolateZoomCamera, isRotationDrag, type OrbitCamera } from './projection3D'

function sameCamera(a: OrbitCamera, b: OrbitCamera) {
  return a.yaw === b.yaw && a.pitch === b.pitch && a.zoom === b.zoom &&
    (a.pan?.[0] ?? 0) === (b.pan?.[0] ?? 0) && (a.pan?.[1] ?? 0) === (b.pan?.[1] ?? 0)
}

/** Defer capture until a drag starts so ordinary clicks still reach points. */
export function useOrbitDrag(camera: OrbitCamera, onChange: (camera: OrbitCamera) => void) {
  const canvas = useRef<SVGSVGElement>(null)
  const latest = useRef({ camera, onChange })
  const drag = useRef<{ pointerId: number; x: number; y: number; camera: OrbitCamera; moved: boolean; panning: boolean } | null>(null)
  const zoomTarget = useRef<OrbitCamera | null>(null)
  const zoomFrame = useRef<number | null>(null)
  const suppressClick = useRef(false)
  const [rotating, setRotating] = useState(false)

  function stopZoom() {
    if (zoomFrame.current !== null) cancelAnimationFrame(zoomFrame.current)
    zoomFrame.current = null
    zoomTarget.current = null
  }

  useLayoutEffect(() => {
    // A loaded/saved camera or reset takes precedence over an unfinished wheel animation.
    if (!sameCamera(camera, latest.current.camera)) stopZoom()
    latest.current = { camera, onChange }
  }, [camera, onChange])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    let lastFrame = 0
    function animate(time: number) {
      zoomFrame.current = null
      const target = zoomTarget.current
      if (!target) return
      const current = latest.current.camera
      const elapsed = lastFrame ? Math.min(64, time - lastFrame) : 16
      lastFrame = time
      const settled = Math.abs(target.zoom - current.zoom) < target.zoom * 0.0005
      const next = settled ? target : interpolateZoomCamera(current, target, 1 - Math.exp(-elapsed / 45))
      latest.current.camera = next
      latest.current.onChange(next)
      if (settled) {
        zoomTarget.current = null
      } else {
        zoomFrame.current = requestAnimationFrame(animate)
      }
    }
    function zoom(event: WheelEvent) {
      if (event.deltaY === 0 || !Number.isFinite(event.deltaY)) return
      event.preventDefault()
      if (drag.current?.moved) return
      // A click released outside the SVG must not leave wheel input stuck behind a stale drag.
      drag.current = null
      const current = latest.current.camera
      const target = zoomTarget.current ?? current
      const nextZoom = cameraAfterWheel(target, event.deltaY, event.deltaMode, undefined, event.ctrlKey).zoom
      if (nextZoom === target.zoom) return
      const bounds = element!.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const anchor = { x: (event.clientX - bounds.left) / bounds.width - 0.5, y: (event.clientY - bounds.top) / bounds.height - 0.5 }
      // Accumulate wheel input against the target, but anchor to what is currently visible.
      zoomTarget.current = cameraAtZoom(current, nextZoom, anchor)
      if (zoomFrame.current === null) {
        lastFrame = 0
        zoomFrame.current = requestAnimationFrame(animate)
      }
    }
    // React's wheel listener is passive; this local listener prevents page scrolling over the plot.
    element.addEventListener('wheel', zoom, { passive: false })
    return () => { element.removeEventListener('wheel', zoom); stopZoom() }
  }, [])

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    suppressClick.current = drag.current.moved
    drag.current = null
    setRotating(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handlers: SVGProps<SVGSVGElement> = {
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0) return
      stopZoom()
      suppressClick.current = false
      drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera: latest.current.camera, moved: false, panning: event.shiftKey }
    },
    onPointerMove(event) {
      const start = drag.current
      if (!start || start.pointerId !== event.pointerId) return
      if (event.buttons === 0) { endDrag(event); return }
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (!start.moved && !isRotationDrag(dx, dy)) return
      if (!start.moved) {
        start.moved = true
        event.currentTarget.setPointerCapture(event.pointerId)
        setRotating(true)
      }
      event.preventDefault()
      const bounds = event.currentTarget.getBoundingClientRect()
      const next = start.panning
        ? cameraAfterPan(start.camera, dx / Math.max(1, bounds.width), dy / Math.max(1, bounds.height))
        : cameraAfterDrag(start.camera, dx, dy)
      latest.current.camera = next
      onChange(next)
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onDoubleClick(event) {
      if (event.target instanceof Element && event.target.closest('[role="button"]')) return
      event.preventDefault()
      stopZoom()
      latest.current.camera = DEFAULT_ORBIT_CAMERA
      onChange(DEFAULT_ORBIT_CAMERA)
    },
    onClickCapture(event) {
      if (!suppressClick.current || event.detail === 0) return
      suppressClick.current = false
      event.preventDefault()
      event.stopPropagation()
    },
  }
  return { canvas, rotating, handlers }
}
