import type { ScatterPoint } from './types'
import './charts.css'

export function ChartDataTable({ points, xLabel, yLabel, zLabel, itemLabel = 'Item', formatValue, onPointActivate }: {
  points: readonly (ScatterPoint & { readonly z?: number })[]
  xLabel: string
  yLabel: string
  zLabel?: string
  itemLabel?: string
  formatValue: (value: number) => string
  onPointActivate: (id: string) => void
}) {
  return (
    <details className="chart-data">
      <summary>View chart data ({points.length})</summary>
      <div className="chart-data-scroll" tabIndex={0} role="region" aria-label="Plotted data, scroll for more rows">
        <table>
          <caption className="sr-only">Matching chart points, including points with overlapping coordinates.</caption>
          <thead><tr><th scope="col">{itemLabel}</th><th scope="col">X · {xLabel}</th><th scope="col">Y · {yLabel}</th>{zLabel && <th scope="col">Z · {zLabel}</th>}</tr></thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.id}>
                <th scope="row"><button className="text-button" onClick={() => onPointActivate(point.id)}>{point.label}</button></th>
                <td>{formatValue(point.x)}</td>
                <td>{formatValue(point.y)}</td>
                {zLabel && <td>{point.z === undefined ? '—' : formatValue(point.z)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
