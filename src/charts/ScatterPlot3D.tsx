import { useId, useState } from 'react'
import { formatTick, numericDomain, numericTicks } from './numericScale'
import { create3DProjector, projectUnit3D, type OrbitCamera, type ScatterPoint3D, type Vector3 } from './projection3D'
import type { ScatterPlotProps } from './ScatterPlot'
import { useChartSize } from './useChartSize'
import { useOrbitDrag } from './useOrbitDrag'
import './charts.css'

interface ScatterPlot3DProps extends Omit<ScatterPlotProps, 'points' | 'rangeSelection' | 'onRangeSelect'> {
  points: readonly ScatterPoint3D[]
  zLabel: string
  camera: OrbitCamera
  onCameraChange: (camera: OrbitCamera) => void
}

const corners: readonly Vector3[] = [
  [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1],
]
const edges = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]] as const
const axisNames = ['X', 'Y', 'Z'] as const
function axisCoordinate(axis: number, value: number): Vector3 {
  return [axis === 0 ? value : -1, axis === 1 ? value : -1, axis === 2 ? value : -1]
}

/** SVG projection of three numeric dimensions, with depth ordering and an orbit camera. */
export function ScatterPlot3D({ points, xLabel, yLabel, zLabel, highlightedIds = [], matchingIds, camera, onCameraChange, formatValue, onPointActivate }: ScatterPlot3DProps) {
  const id = useId()
  const { container, width, height } = useChartSize()
  const { canvas, rotating, handlers } = useOrbitDrag(camera, onCameraChange)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const activeId = hoveredId ?? focusedId
  const highlighted = new Set(highlightedIds)
  const matching = matchingIds ? new Set(matchingIds) : null
  const axes = [
    { label: xLabel, domain: numericDomain(points.map((point) => point.x)) },
    { label: yLabel, domain: numericDomain(points.map((point) => point.y)) },
    { label: zLabel, domain: numericDomain(points.map((point) => point.z)) },
  ] as const
  const unit = (point: Vector3) => projectUnit3D(point, camera, width, height)
  const project = create3DProjector([axes[0].domain, axes[1].domain, axes[2].domain], camera, width, height)
  const projected = points.map((point) => ({ point, position: project([point.x, point.y, point.z]) }))
    .sort((a, b) => a.position.depth - b.position.depth)
  const active = projected.find(({ point }) => point.id === activeId)
  const origin = unit([-1, -1, -1])

  return (
      <div ref={container} className={`cartesian-chart orbit-chart${rotating ? ' orbit-chart-rotating' : ''}`}>
        <svg ref={canvas} viewBox={`0 0 ${width} ${height}`} role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} {...handlers}>
          <title id={`${id}-title`}>{`3D scatterplot: ${xLabel}, ${yLabel}, ${zLabel}`}</title>
          <desc id={`${id}-description`}>Drag to rotate and tilt. Scroll to zoom. Double-click the background to reset the view. Hover or focus points for values; click or press Enter to open details. The data table includes every matching point.</desc>
          <g aria-hidden="true" className="orbit-grid">
            <polygon points={[0, 1, 3, 2].map((index) => { const point = unit(corners[index]!); return `${point.x},${point.y}` }).join(' ')} />
            {edges.map(([a, b]) => {
              const start = unit(corners[a])
              const end = unit(corners[b])
              return <line key={`${a}-${b}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
            })}
            {axes.map((axis, index) => {
              const end = unit(axisCoordinate(index, 1))
              const label = unit(axisCoordinate(index, 1.2))
              return (
                <g key={index} className={`orbit-axis orbit-axis-${index}`}>
                  <line x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} />
                  {numericTicks(axis.domain, 3).map((value, tick) => {
                    const point = unit(axisCoordinate(index, tick - 1))
                    // The shared origin only needs one label to avoid three overlapping numbers.
                    if (tick === 0 && index !== 2) return null
                    return <text key={tick} x={point.x + (index === 2 ? -10 : 0)} y={point.y + (index === 2 ? 4 : 16)} textAnchor={index === 2 ? 'end' : 'middle'}>{formatTick(value)}</text>
                  })}
                  <text className="orbit-axis-title" x={label.x} y={label.y - 8} textAnchor="middle">{axisNames[index]}</text>
                </g>
              )
            })}
          </g>
          {projected.map(({ point, position }) => (
            <g key={point.id} transform={`translate(${position.x} ${position.y})`}
              className={`scatter-point${highlighted.has(point.id) ? ' scatter-point-selected' : ''}${activeId === point.id && !rotating ? ' scatter-point-active' : ''}${matching && !matching.has(point.id) ? ' scatter-point-excluded' : ''}`}
              role="button" tabIndex={0}
              aria-label={`${point.label}. ${highlighted.has(point.id) ? 'Selected. ' : ''}${matching && !matching.has(point.id) ? 'Outside plot range. ' : ''}${xLabel}: ${formatValue(point.x)}. ${yLabel}: ${formatValue(point.y)}. ${zLabel}: ${formatValue(point.z)}. Open details.`}
              aria-describedby={!rotating && activeId === point.id ? `${id}-tooltip` : undefined}
              onPointerEnter={() => setHoveredId(point.id)} onPointerLeave={() => setHoveredId(null)}
              onFocus={() => setFocusedId(point.id)} onBlur={() => setFocusedId(null)}
              onClick={() => onPointActivate(point.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPointActivate(point.id) }
                if (event.key === 'Escape') { setHoveredId(null); setFocusedId(null) }
              }}>
              <circle r={12} className="scatter-hit-area" />
              <circle r={highlighted.has(point.id) ? 7 : 5.5} className="scatter-dot" />
            </g>
          ))}
        </svg>
        {active && !rotating && (
          <div id={`${id}-tooltip`} role="tooltip" className="chart-tooltip" style={{ left: Math.max(8, Math.min(active.position.x + 14, width - 248)), top: Math.max(8, active.position.y - 100) }}>
            <strong>{active.point.label}</strong>
            <dl>{axes.map((axis, index) => <div key={index}><dt>{axisNames[index]} · {axis.label}</dt><dd>{formatValue([active.point.x, active.point.y, active.point.z][index]!)}</dd></div>)}</dl>
            <span>Open for details</span>
          </div>
        )}
      </div>
  )
}
