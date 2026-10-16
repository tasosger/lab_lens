import { rangeToRectangle } from './rangeSelection'
import { useRangeBrush } from './useRangeBrush'
import type { CartesianLayout, CartesianRange } from './types'

interface CartesianBrushProps {
  layout: CartesianLayout
  value: CartesianRange | null
  onChange: (range: CartesianRange) => void
}

/** Generic SVG selection layer, independent of points, properties, and filters. */
export function CartesianBrush({ layout, value, onChange }: CartesianBrushProps) {
  const { preview, handlers } = useRangeBrush(layout, onChange)
  const rectangle = preview ?? (value ? rangeToRectangle(value, layout) : null)
  return (
    <g className="cartesian-brush" aria-hidden="true">
      {rectangle && (
        <rect className="chart-brush-selection"
          x={rectangle.left} y={rectangle.top}
          width={rectangle.right - rectangle.left} height={rectangle.bottom - rectangle.top}
        />
      )}
      <rect className="chart-brush-hit" x={layout.left} y={layout.top}
        width={layout.right - layout.left} height={layout.bottom - layout.top} {...handlers}
      />
    </g>
  )
}
