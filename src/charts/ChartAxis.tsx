import { formatTick, numericTicks } from './numericScale'
import type { CartesianLayout, ChartAxisDefinition } from './types'

export function ChartAxis({ orientation, axis, layout }: {
  orientation: 'x' | 'y'
  axis: ChartAxisDefinition
  layout: CartesianLayout
}) {
  const horizontal = orientation === 'x'
  const scale = horizontal ? layout.xScale : layout.yScale
  const ticks = numericTicks(axis.domain, horizontal && layout.width < 500 ? 3 : 5)

  return (
    <g className="chart-axis" aria-hidden="true">
      {ticks.map((value, index) => (
        <g key={index}>
          <line
            className="chart-grid-line"
            x1={horizontal ? scale(value) : layout.left}
            x2={horizontal ? scale(value) : layout.right}
            y1={horizontal ? layout.top : scale(value)}
            y2={horizontal ? layout.bottom : scale(value)}
          />
          <text
            x={horizontal ? scale(value) : layout.left - 12}
            y={horizontal ? layout.bottom + 23 : scale(value) + 4}
            textAnchor={horizontal ? 'middle' : 'end'}
          >
            {formatTick(value)}
          </text>
        </g>
      ))}
      {horizontal ? (
        <text className="chart-axis-label" x={(layout.left + layout.right) / 2} y={layout.height - 12} textAnchor="middle">
          {axis.label}
        </text>
      ) : (
        <text className="chart-axis-label" transform={`translate(16 ${(layout.top + layout.bottom) / 2}) rotate(-90)`} textAnchor="middle">
          {axis.label}
        </text>
      )}
    </g>
  )
}
