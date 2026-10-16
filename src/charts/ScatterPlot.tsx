import { useId, useState } from 'react'
import { CartesianChart } from './CartesianChart'
import { ChartTooltip } from './ChartTooltip'
import { numericDomain } from './numericScale'
import type { ScatterPoint } from './types'

export interface ScatterPlotProps {
  points: readonly ScatterPoint[]
  xLabel: string
  yLabel: string
  highlightedIds?: readonly string[]
  formatValue: (value: number) => string
  onPointActivate: (id: string) => void
}

/** Dataset-independent scatterplot. Coordinates remain the original numeric values. */
export function ScatterPlot({ points, xLabel, yLabel, highlightedIds = [], formatValue, onPointActivate }: ScatterPlotProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const tooltipId = useId()
  const activeId = hoveredId ?? focusedId
  const activePoint = points.find((point) => point.id === activeId)
  const highlighted = new Set(highlightedIds)
  const domain = {
    x: numericDomain(points.map((point) => point.x)),
    y: numericDomain(points.map((point) => point.y)),
  }

  return (
    <CartesianChart
      title={`${yLabel} versus ${xLabel}`}
      description={`${points.length} data points. Hover or focus a point for values. Click, Enter, or Space opens its details. Points may overlap; the data table lists all plotted points.`}
      xAxis={{ label: xLabel, domain: domain.x }}
      yAxis={{ label: yLabel, domain: domain.y }}
      overlay={(layout) => activePoint && (
        <ChartTooltip id={tooltipId} width={layout.width} height={layout.height}
          x={layout.xScale(activePoint.x)} y={layout.yScale(activePoint.y)}>
          <strong>{activePoint.label}</strong>
          <dl>
            <div><dt>X · {xLabel}</dt><dd>{formatValue(activePoint.x)}</dd></div>
            <div><dt>Y · {yLabel}</dt><dd>{formatValue(activePoint.y)}</dd></div>
          </dl>
          <span>Open for details</span>
        </ChartTooltip>
      )}
    >
      {(layout) => points.map((point) => (
        <g
          key={point.id}
          transform={`translate(${layout.xScale(point.x)} ${layout.yScale(point.y)})`}
          className={`scatter-point${highlighted.has(point.id) ? ' scatter-point-selected' : ''}${activeId === point.id ? ' scatter-point-active' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={`${point.label}. ${highlighted.has(point.id) ? 'Selected. ' : ''}${xLabel}: ${formatValue(point.x)}. ${yLabel}: ${formatValue(point.y)}. Open details.`}
          aria-describedby={activeId === point.id ? tooltipId : undefined}
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
    </CartesianChart>
  )
}
