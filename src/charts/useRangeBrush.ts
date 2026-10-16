import { useEffect, useRef, useState, type PointerEvent, type SVGProps } from 'react'
import { clampToPlot, isRangeDrag, rectangleToRange, selectionRectangle } from './rangeSelection'
import type { CartesianLayout, CartesianRange, ChartPosition, ChartRectangle } from './types'

interface Drag {
  pointerId: number
  start: ChartPosition
  target: SVGRectElement
}

/** Own pointer capture and a transient preview; commit a range only on release. */
export function useRangeBrush(layout: CartesianLayout, onCommit: (range: CartesianRange) => void) {
  const drag = useRef<Drag | null>(null)
  const [preview, setPreview] = useState<ChartRectangle | null>(null)

  function finish() {
    const current = drag.current
    drag.current = null
    setPreview(null)
    if (current?.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId)
  }

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) {
        event.preventDefault()
        finish()
      }
    }
    window.addEventListener('keydown', cancel)
    return () => {
      window.removeEventListener('keydown', cancel)
      const current = drag.current
      drag.current = null
      if (current?.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId)
    }
  }, [])

  function position(event: PointerEvent<SVGRectElement>): ChartPosition | null {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM()
    if (!matrix) return null
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return clampToPlot(point, layout)
  }

  const handlers: SVGProps<SVGRectElement> = {
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0 || drag.current) return
      const start = position(event)
      if (!start) return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { pointerId: event.pointerId, start, target: event.currentTarget }
      setPreview(selectionRectangle(start, start))
    },
    onPointerMove(event) {
      if (drag.current?.pointerId !== event.pointerId) return
      const end = position(event)
      if (end) setPreview(selectionRectangle(drag.current.start, end))
    },
    onPointerUp(event) {
      if (drag.current?.pointerId !== event.pointerId) return
      const end = position(event)
      const rectangle = end ? selectionRectangle(drag.current.start, end) : null
      finish()
      if (rectangle && isRangeDrag(rectangle)) onCommit(rectangleToRange(rectangle, layout))
    },
    onPointerCancel: finish,
    onLostPointerCapture: finish,
  }
  return { preview, handlers }
}
