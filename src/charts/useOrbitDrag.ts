import { useEffect, useRef, useState, type PointerEvent, type SVGProps } from 'react'
import { cameraAfterDrag, cameraAfterWheel, DEFAULT_ORBIT_CAMERA, isRotationDrag, type OrbitCamera } from './projection3D'

/** Defer capture until a drag starts so ordinary clicks still reach points. */
export function useOrbitDrag(camera: OrbitCamera, onChange: (camera: OrbitCamera) => void) {
  const canvas = useRef<SVGSVGElement>(null)
  const latest = useRef({ camera, onChange })
  const drag = useRef<{ pointerId: number; x: number; y: number; camera: OrbitCamera; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [rotating, setRotating] = useState(false)

  useEffect(() => { latest.current = { camera, onChange } }, [camera, onChange])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    function zoom(event: WheelEvent) {
      if (event.deltaY === 0 || !Number.isFinite(event.deltaY)) return
      event.preventDefault()
      if (drag.current?.moved) return
      const next = cameraAfterWheel(latest.current.camera, event.deltaY, event.deltaMode)
      // Accumulate rapid wheel events even before React has rendered the previous step.
      latest.current.camera = next
      latest.current.onChange(next)
    }
    // React's wheel listener is passive; this local listener prevents page scrolling over the plot.
    element.addEventListener('wheel', zoom, { passive: false })
    return () => element.removeEventListener('wheel', zoom)
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
      suppressClick.current = false
      drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera, moved: false }
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
      const next = cameraAfterDrag(start.camera, dx, dy)
      latest.current.camera = next
      onChange(next)
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onDoubleClick(event) {
      if (event.target instanceof Element && event.target.closest('[role="button"]')) return
      event.preventDefault()
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
