import { useState, type CSSProperties } from 'react'
import { correlationDescription, type CorrelationRow } from './correlation'
import { heatmapLayout } from './responsiveLayout'
import { nextGridCell } from './gridNavigation'
import { useChartSize } from './useChartSize'
import type { ChartDimension } from './types'
import './charts.css'

function cellColor(value: number | null) {
  if (value === null) return '#edf0f5'
  // A fixed diverging scale keeps colors comparable across filters and dashboards.
  return `hsl(${value < 0 ? 24 : 220} ${Math.abs(value) * 65}% ${97 - Math.abs(value) * 57}%)`
}

const propertyLabel = (property: ChartDimension) => `${property.label} (${property.groupLabel})`

export function CorrelationHeatmapPlot<Id extends string>({ columns, matrix, onInspect }: {
  columns: readonly ChartDimension<Id>[]
  matrix: readonly CorrelationRow<Id>[]
  onInspect: (x: Id, y: Id) => void
}) {
  const { container, width, preferredHeight } = useChartSize()
  const layout = heatmapLayout(width, columns.length, matrix.length, preferredHeight)
  const [active, setActive] = useState<{ x: string; y: string } | null>(null)
  const [focused, setFocused] = useState<{ x: string; y: string } | null>(null)
  const focusCell = focused && columns.some(column => column.id === focused.x) && matrix.some(row => row.property.id === focused.y)
    ? focused : { x: columns[0]?.id, y: matrix[0]?.property.id }
  const activeCell = matrix.find(row => row.property.id === active?.y)?.cells.find(cell => cell.x.id === active?.x)
  const style = {
    '--heatmap-gap': `${layout.gap}px`,
    '--heatmap-cell-height': `${layout.cellHeight}px`,
    maxHeight: layout.viewportHeight,
  } as CSSProperties

  return <>
    <div data-chart-surface ref={container} className="heatmap-fit" role="region" aria-label="Property correlation matrix"
      data-rotated={layout.rotateHeaders} data-values={layout.showValues} data-counts={layout.showCounts} style={style}>
      <table className="correlation-heatmap" style={{ width: layout.contentWidth }}>
        <caption className="sr-only">Pearson correlations. Use arrow keys to move between cells, Home and End to move across a row, and Control plus Home or End to reach the first or last cell. Enter opens the scatterplot. Tab leaves the matrix.</caption>
        <colgroup><col style={{ width: `${layout.rowLabelPercent}%` }} /><col span={columns.length} /></colgroup>
        <thead><tr><th scope="col">Y ↓ / X →</th>{columns.map((property, index) => <th scope="col" key={property.id}>
          <div className={index % layout.columnLabelStride === 0 ? 'heatmap-column-label' : 'sr-only'} title={propertyLabel(property)}>
            <span>{property.label}</span><small>{property.groupLabel}</small>
          </div>
        </th>)}</tr></thead>
        <tbody>{matrix.map((row, index) => <tr key={row.property.id}>
          <th scope="row" title={propertyLabel(row.property)}>
            <div className={index % layout.rowLabelStride === 0 ? 'heatmap-row-label' : 'sr-only'}>
              <span>{row.property.label}</span>{layout.showRowGroups && <small>{row.property.groupLabel}</small>}
            </div>
          </th>
          {row.cells.map((cell, columnIndex) => <td key={cell.x.id}>
            <button className="correlation-cell" style={{ backgroundColor: cellColor(cell.value), color: cell.value !== null && Math.abs(cell.value) >= 0.65 ? '#fff' : '#26364e' }}
              data-row={index} data-column={columnIndex} tabIndex={focusCell.x === cell.x.id && focusCell.y === cell.y.id ? 0 : -1}
              title={`${propertyLabel(cell.y)} versus ${propertyLabel(cell.x)}: ${correlationDescription(cell)}; ${cell.count} paired experiments. Open scatterplot.`}
              aria-label={`${propertyLabel(cell.y)} versus ${propertyLabel(cell.x)}: ${correlationDescription(cell)}; ${cell.count} paired experiments. Open scatterplot.`}
              onMouseEnter={() => setActive({ x: cell.x.id, y: cell.y.id })} onMouseLeave={() => setActive(null)}
              onFocus={() => { const identity = { x: cell.x.id, y: cell.y.id }; setActive(identity); setFocused(identity) }} onBlur={() => setActive(null)}
              onKeyDown={event => {
                const next = nextGridCell({ row: index, column: columnIndex }, event.key, matrix.length, columns.length, event.ctrlKey || event.metaKey)
                if (!next) return
                event.preventDefault()
                container.current?.querySelector<HTMLButtonElement>(`button[data-row="${next.row}"][data-column="${next.column}"]`)?.focus()
              }}
              onClick={() => onInspect(cell.x.id, cell.y.id)}>
              <strong>{cell.value === null ? 'N/A' : cell.value.toFixed(2)}</strong><span>n = {cell.count}</span>
            </button>
          </td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <div aria-live="polite">
      {activeCell && <div className="heatmap-active-details"><strong>{propertyLabel(activeCell.y)} × {propertyLabel(activeCell.x)}</strong>: {correlationDescription(activeCell)} · n = {activeCell.count}</div>}
    </div>
  </>
}
