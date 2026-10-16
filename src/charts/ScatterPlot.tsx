import { useId, useState } from 'react'
import { CartesianChart } from './CartesianChart'
import { CartesianBrush } from './CartesianBrush'
import { CartesianRangeControls } from './CartesianRangeControls'
import { numericDomain } from './numericScale'
import type { CartesianRange, ScatterPoint } from './types'

export interface ScatterPlotProps {
  points: readonly ScatterPoint[]
  xLabel: string
  yLabel: string
  highlightedIds?: readonly string[]
  matchingIds?: readonly string[]
  rangeSelection?: CartesianRange | null
  onRangeSelect?: (range: CartesianRange) => void
  formatValue: (value: number) => string
  onPointActivate: (id: string) => void
}

/** Dataset-independent scatterplot. Coordinates remain the original numeric values. */
export function ScatterPlot({ points, xLabel, yLabel, highlightedIds = [], matchingIds, rangeSelection = null, onRangeSelect, formatValue, onPointActivate }: ScatterPlotProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const tooltipId = useId()
  const activeId = hoveredId ?? focusedId
  const activePoint = points.find((point) => point.id === activeId)
  const highlighted = new Set(highlightedIds)
  const matching = matchingIds ? new Set(matchingIds) : null
  const domain: CartesianRange = {
    x: numericDomain(points.map((point) => point.x)),
    y: numericDomain(points.map((point) => point.y)),
  }

  return (
    <>
    {onRangeSelect && (
      <CartesianRangeControls selecting={selecting}
        onSelectingChange={(value) => { setSelecting(value); setHoveredId(null); setFocusedId(null) }}
        value={rangeSelection ?? domain} xLabel={xLabel} yLabel={yLabel} onApply={onRangeSelect} />
    )}
    <CartesianChart
      title={`${yLabel} versus ${xLabel}`}
      description={`${points.length} data points. ${selecting ? 'Drag a rectangle to apply X and Y range filters, or enter numeric bounds above.' : 'Hover or focus a point for values. Click, Enter, or Space opens its details.'} Faded points are outside the plot range. Points may overlap; the data table lists matching points.`}
      xAxis={{ label: xLabel, domain: domain.x }}
      yAxis={{ label: yLabel, domain: domain.y }}
      overlay={(layout) => !selecting && activePoint && (
        <div
          id={tooltipId}
          role="tooltip"
          className="chart-tooltip"
          style={{
            left: Math.max(8, Math.min(layout.xScale(activePoint.x) + 14, layout.width - 248)),
            top: Math.max(8, layout.yScale(activePoint.y) - 100),
          }}
        >
          <strong>{activePoint.label}</strong>
          <dl>
            <div><dt>X · {xLabel}</dt><dd>{formatValue(activePoint.x)}</dd></div>
            <div><dt>Y · {yLabel}</dt><dd>{formatValue(activePoint.y)}</dd></div>
          </dl>
          <span>Open for details</span>
        </div>
      )}
    >
      {(layout) => <>
      {points.map((point) => (
        <g
          key={point.id}
          transform={`translate(${layout.xScale(point.x)} ${layout.yScale(point.y)})`}
          className={`scatter-point${highlighted.has(point.id) ? ' scatter-point-selected' : ''}${activeId === point.id ? ' scatter-point-active' : ''}${matching && !matching.has(point.id) ? ' scatter-point-excluded' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={`${point.label}. ${highlighted.has(point.id) ? 'Selected. ' : ''}${matching && !matching.has(point.id) ? 'Outside plot range. ' : ''}${xLabel}: ${formatValue(point.x)}. ${yLabel}: ${formatValue(point.y)}. Open details.`}
          aria-describedby={!selecting && activeId === point.id ? tooltipId : undefined}
          onPointerEnter={() => setHoveredId(point.id)}
          onPointerLeave={() => setHoveredId(null)}
          onFocus={() => setFocusedId(point.id)}
          onBlur={() => setFocusedId(null)}
          onClick={() => onPointActivate(point.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onPointActivate(point.id)
            }
            if (event.key === 'Escape') {
              setHoveredId(null)
              setFocusedId(null)
            }
          }}
        >
          <circle r={12} className="scatter-hit-area" />
          <circle r={highlighted.has(point.id) ? 7 : 5.5} className="scatter-dot" />
        </g>
      ))}
      {selecting && onRangeSelect && (
        <CartesianBrush key={[layout.width, layout.height, xLabel, yLabel, ...domain.x, ...domain.y].join(':')}
          layout={layout} value={rangeSelection} onChange={onRangeSelect} />
      )}
      </>}
    </CartesianChart>
    </>
  )
}
