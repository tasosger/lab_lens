import { buildCorrelationMatrix, matchingExperiments, selectedProperties } from './analysisData'
import { ChartTypeSelect } from './ChartTypeSelect'
import type { ChartViewProps } from './ChartViewProps'
import { CorrelationHeatmapPlot } from './CorrelationHeatmapPlot'
import { PropertyMultiSelect } from './PropertyMultiSelect'
import './analysisCharts.css'

export function CorrelationHeatmapView({ id, showControls, configuration, onChartAction, experiments, matchingIds,
  properties, isFiltered, onResetQuery }: ChartViewProps) {
  const columns = selectedProperties(properties, configuration.heatmapX)
  const rows = selectedProperties(properties, configuration.heatmapY)
  const matching = matchingExperiments(experiments, matchingIds)
  const matrix = buildCorrelationMatrix(matching, columns, rows, configuration.hideZeroInputs)
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
      <CorrelationHeatmapPlot columns={columns} matrix={matrix}
        onInspect={(xPropertyId, yPropertyId) => onChartAction({ type: 'inspect-heatmap-cell', xPropertyId, yPropertyId })} />
      <div className="correlation-legend" aria-label="Color scale: minus one negative correlation, zero, plus one positive correlation">
        <span>−1 · Negative</span><span className="correlation-gradient" /><span>+1 · Positive</span><span className="correlation-na">N/A · Unavailable</span>
      </div>
    </>}
  </section>
}
