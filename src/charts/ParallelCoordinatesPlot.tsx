import { useState } from 'react'
import { formatTick, linearScale, numericTicks } from './numericScale'
import type { NumericDomain } from './types'

export interface ParallelDimension { readonly id: string; readonly label: string; readonly group: string; readonly domain: NumericDomain }
export interface ParallelLine { readonly id: string; readonly label: string; readonly values: readonly number[] }

export function ParallelCoordinatesPlot({ dimensions, lines, selectedIds, onOpen }: {
  dimensions: readonly ParallelDimension[]
  lines: readonly ParallelLine[]
  selectedIds: readonly string[]
  onOpen: (id: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const selected = new Set(selectedIds)
  const active = lines.find(line => line.id === activeId)
  const width = Math.max(640, dimensions.length * 180)
  const x = (index: number) => 90 + index * (width - 180) / Math.max(1, dimensions.length - 1)
  const scales = dimensions.map(dimension => linearScale(dimension.domain, [350, 90]))
  const ordered = [...lines].sort((a, b) => Number(selected.has(a.id)) - Number(selected.has(b.id)))
  const points = (line: ParallelLine) => line.values.map((value, index) => `${x(index)},${scales[index]!(value)}`).join(' ')
  return <div className="parallel-plot">
    <div className="parallel-scroll" tabIndex={0} role="region" aria-label="Parallel coordinates plot. Scroll horizontally to see all axes.">
      <svg viewBox={`0 0 ${width} 400`} style={{ minWidth: width }} role="group" aria-label="One line per experiment across independently scaled property axes">
        {ordered.map(line => <g key={line.id} role="button" tabIndex={0}
          className={`parallel-line${selected.has(line.id) ? ' is-selected' : ''}`}
          aria-label={`${line.label}${selected.has(line.id) ? ', selected' : ''}. ${dimensions.map((d, i) => `${d.label}: ${line.values[i]}`).join(', ')}. Open experiment.`}
          onMouseEnter={() => setActiveId(line.id)} onMouseLeave={() => setActiveId(null)}
          onFocus={() => setActiveId(line.id)} onBlur={() => setActiveId(null)} onClick={() => onOpen(line.id)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(line.id) } }}>
          <title>{line.label}</title>
          <polyline className="parallel-line-visible" points={points(line)} />
          <polyline className="parallel-line-hit" points={points(line)} />
        </g>)}
        {active && <polyline className="parallel-line-active" points={points(active)} />}
        {dimensions.map((dimension, index) => <g className="parallel-axis" key={dimension.id}>
          <text className="parallel-axis-label" x={x(index)} y={28} textAnchor="middle">
            <title>{dimension.label}</title>{dimension.label.length > 22 ? `${dimension.label.slice(0, 20)}…` : dimension.label}
          </text>
          <text className="parallel-axis-group" x={x(index)} y={47} textAnchor="middle">{dimension.group === 'inputs' ? 'Input' : 'Output'}</text>
          <line x1={x(index)} x2={x(index)} y1={90} y2={350} />
          {numericTicks(dimension.domain).map((value, tick) => <g key={tick}>
            <line x1={x(index) - 4} x2={x(index) + 4} y1={scales[index]!(value)} y2={scales[index]!(value)} />
            <text x={x(index) - 9} y={scales[index]!(value)} textAnchor="end" dominantBaseline="central">{formatTick(value)}</text>
          </g>)}
        </g>)}
      </svg>
    </div>
    <div className="parallel-active-details" aria-live="polite">
      {active ? <><strong>{active.label}</strong><dl>{dimensions.map((dimension, index) => <div key={dimension.id}>
        <dt>{dimension.label} ({dimension.group === 'inputs' ? 'Input' : 'Output'})</dt><dd>{active.values[index]}</dd>
      </div>)}</dl></> : <span>Hover over or focus a line to inspect its values.</span>}
    </div>
  </div>
}
