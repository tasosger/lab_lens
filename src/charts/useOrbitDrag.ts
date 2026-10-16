import { useRef, useState, type PointerEvent, type SVGProps } from 'react'
import { cameraAfterDrag, isRotationDrag, type OrbitCamera } from './projection3D'

/** Defer capture until a drag starts so ordinary clicks still reach points. */
export function useOrbitDrag(camera: OrbitCamera, onChange: (camera: OrbitCamera) => void) {
  const drag = useRef<{ pointerId: number; x: number; y: number; camera: OrbitCamera; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [rotating, setRotating] = useState(false)

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
      onChange(cameraAfterDrag(start.camera, dx, dy))
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onClickCapture(event) {
      if (!suppressClick.current) return
      suppressClick.current = false
      event.preventDefault()
      event.stopPropagation()
    },
  }
  return { rotating, handlers }
}
