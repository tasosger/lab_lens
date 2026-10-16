import { correlationDescription } from '../../charts/correlation'
import { buildCorrelationMatrix, matchingExperiments, selectedProperties } from './analysisData'
import { ChartTypeSelect } from './ChartTypeSelect'
import type { ChartViewProps } from './ChartViewProps'
import { PropertyMultiSelect } from './PropertyMultiSelect'
import './analysisCharts.css'

function cellColor(value: number | null) {
  if (value === null) return '#edf0f5'
  // A fixed diverging scale keeps colors comparable across filters and dashboards.
  return `hsl(${value < 0 ? 24 : 220} ${Math.abs(value) * 65}% ${97 - Math.abs(value) * 57}%)`
}

export function CorrelationHeatmapView({ id, showControls, configuration, onChartAction, experiments, matchingIds,
  properties, isFiltered, onResetQuery }: ChartViewProps) {
  const columns = selectedProperties(properties, configuration.heatmapX)
  const rows = selectedProperties(properties, configuration.heatmapY)
  const matching = matchingExperiments(experiments, matchingIds)
  const matrix = buildCorrelationMatrix(matching, columns, rows)
  return <section id={id} className="heatmap-view" aria-label="Correlation heatmap">
    {showControls && <div id={`${id}-controls`} className="chart-controls heatmap-controls">
      <ChartTypeSelect value="heatmap" onChange={chartType => onChartAction({ type: 'chart-type', chartType })} />
      <PropertyMultiSelect label="X axis · columns" properties={properties} value={configuration.heatmapX}
        onChange={propertyIds => onChartAction({ type: 'heatmap-axis', axis: 'x', propertyIds })} />
      <PropertyMultiSelect label="Y axis · rows" properties={properties} value={configuration.heatmapY}
        onChange={propertyIds => onChartAction({ type: 'heatmap-axis', axis: 'y', propertyIds })} />
    </div>}
    {!columns.length || !rows.length || !matching.length ? <div className="empty-state">
      <h3>{!columns.length || !rows.length ? 'Choose properties for both axes' : 'No matching experiments'}</h3>
      <p>{!columns.length || !rows.length ? 'Choose any inputs or outputs for the rows and columns.' : 'Adjust your search or filters to compare property correlations.'}</p>
      {isFiltered && <button className="button" onClick={onResetQuery}>Reset search and filters</button>}
    </div> : <>
      <div className="chart-summary" role="status"><p><strong>{matching.length} matching experiments · {rows.length} rows × {columns.length} columns</strong></p></div>
      <div className="heatmap-scroll" tabIndex={0} role="region" aria-label="Property correlation matrix">
        <table className="correlation-heatmap"><caption className="sr-only">Pearson correlations. Each cell shows r and the number of experiments with both values. Select a cell to open its scatterplot.</caption>
          <thead><tr><th scope="col">Y ↓ / X →</th>{columns.map(property => <th scope="col" key={property.id}>{property.name}<small>{property.group === 'inputs' ? 'Input' : 'Output'}</small></th>)}</tr></thead>
          <tbody>{matrix.map(row => <tr key={row.property.id}>
            <th scope="row">{row.property.name}<small>{row.property.group === 'inputs' ? 'Input' : 'Output'}</small></th>
            {row.cells.map(cell => <td key={cell.x.id}>
              <button className="correlation-cell" style={{ backgroundColor: cellColor(cell.value), color: cell.value !== null && Math.abs(cell.value) >= 0.65 ? '#fff' : '#26364e' }}
                title={`${correlationDescription(cell)}; ${cell.count} paired experiments. Open scatterplot.`}
                aria-label={`${cell.y.name} (${cell.y.group}) versus ${cell.x.name} (${cell.x.group}): ${correlationDescription(cell)}; ${cell.count} paired experiments. Open scatterplot.`}
                onClick={() => onChartAction({ type: 'inspect-heatmap-cell', xPropertyId: cell.x.id, yPropertyId: cell.y.id })}>
                <strong>{cell.value === null ? 'N/A' : cell.value.toFixed(2)}</strong><span>n = {cell.count}</span>
              </button>
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="correlation-legend" aria-label="Color scale: minus one negative correlation, zero, plus one positive correlation">
        <span>−1 · Negative</span><span className="correlation-gradient" /><span>+1 · Positive</span><span className="correlation-na">N/A · Unavailable</span>
      </div>
      <p className="chart-help">Each cell measures a linear relationship using only experiments with both values. N/A means fewer than 3 paired values or a constant property.
        Correlation does not establish causation. Click a cell to inspect the relationship in a scatterplot.</p>
    </>}
  </section>
}
