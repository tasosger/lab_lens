import { useState } from 'react'
import { formatTick, linearScale, numericTicks } from './numericScale'
import { fitChartLabel, parallelLayout } from './responsiveLayout'
import type { NumericDomain } from './types'
import { useChartSize } from './useChartSize'

export interface ParallelDimension { readonly id: string; readonly label: string; readonly group: string; readonly domain: NumericDomain }
export interface ParallelLine { readonly id: string; readonly label: string; readonly values: readonly number[] }

export function ParallelCoordinatesPlot({ dimensions, lines, selectedIds, onOpen }: {
  dimensions: readonly ParallelDimension[]
  lines: readonly ParallelLine[]
  selectedIds: readonly string[]
  onOpen: (id: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeAxisId, setActiveAxisId] = useState<string | null>(null)
  const { container, width } = useChartSize()
  const layout = parallelLayout(width, dimensions.length)
  const selected = new Set(selectedIds)
  const active = lines.find(line => line.id === activeId)
  const activeAxis = dimensions.find(dimension => dimension.id === activeAxisId)
  const { x } = layout
  const scales = dimensions.map(dimension => linearScale(dimension.domain, [layout.bottom, layout.top]))
  const ordered = [...lines].sort((a, b) => Number(selected.has(a.id)) - Number(selected.has(b.id)))
  const points = (line: ParallelLine) => line.values.map((value, index) => `${x(index)},${scales[index]!(value)}`).join(' ')
  return <div className="parallel-plot">
    <div ref={container} className="parallel-fit" role="region" aria-label="Parallel coordinates plot">
      <svg viewBox={`0 0 ${width} ${layout.height}`} role="group" aria-label="One line per experiment across independently scaled property axes">
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
          <text className="parallel-axis-label" x={x(index)} y={layout.labelY(index)}
            textAnchor={layout.rotateLabels ? 'start' : 'middle'}
            transform={layout.rotateLabels ? `rotate(-90 ${x(index)} ${layout.labelY(index)})` : undefined}
            tabIndex={0} aria-label={`${dimension.label} (${dimension.group === 'inputs' ? 'Input' : 'Output'}). Axis range ${formatTick(dimension.domain[0])} to ${formatTick(dimension.domain[1])}.`}
            onMouseEnter={() => setActiveAxisId(dimension.id)} onMouseLeave={() => setActiveAxisId(null)}
            onFocus={() => setActiveAxisId(dimension.id)} onBlur={() => setActiveAxisId(null)}>
            <title>{`${dimension.label} (${dimension.group === 'inputs' ? 'Input' : 'Output'})`}</title>
            {fitChartLabel(dimension.label, layout.labelWidth)}
          </text>
          {!layout.rotateLabels && <text className="parallel-axis-group" x={x(index)} y={47} textAnchor="middle">{dimension.group === 'inputs' ? 'Input' : 'Output'}</text>}
          <line x1={x(index)} x2={x(index)} y1={layout.top} y2={layout.bottom} />
          {numericTicks(dimension.domain, layout.rotateLabels ? 3 : 5).map((value, tick) => <g key={tick}>
            <line x1={x(index) - 4} x2={x(index) + 4} y1={scales[index]!(value)} y2={scales[index]!(value)} />
            {(activeAxis ? dimension.id === activeAxis.id : index % layout.tickLabelStride === 0) &&
              <text x={x(index) - 9} y={scales[index]!(value)} textAnchor="end" dominantBaseline="central">{formatTick(value)}</text>}
          </g>)}
        </g>)}
      </svg>
    </div>
    <div className="parallel-active-details" aria-live="polite">
      {activeAxis ? <><strong>{activeAxis.label} ({activeAxis.group === 'inputs' ? 'Input' : 'Output'})</strong> · Axis range {formatTick(activeAxis.domain[0])} to {formatTick(activeAxis.domain[1])}</>
        : active ? <><strong>{active.label}</strong><dl>{dimensions.map((dimension, index) => <div key={dimension.id}>
        <dt>{dimension.label} ({dimension.group === 'inputs' ? 'Input' : 'Output'})</dt><dd>{active.values[index]}</dd>
      </div>)}</dl></> : <span>Hover over or focus a line for its values, or an axis label for its full name and scale.</span>}
    </div>
  </div>
}
