import { ParallelCoordinatesPlot } from '../../charts/ParallelCoordinatesPlot'
import { formatValue } from '../experiments/format'
import { buildParallelData, matchingExperiments, selectedProperties } from './analysisData'
import { ChartTypeSelect } from './ChartTypeSelect'
import type { ChartViewProps } from './ChartViewProps'
import { PropertyMultiSelect } from './PropertyMultiSelect'
import './analysisCharts.css'

export function ParallelCoordinatesView({ id, showControls, configuration, onChartAction, experiments, matchingIds, selectedIds,
  properties, isFiltered, onOpen, onResetQuery }: ChartViewProps) {
  const axes = selectedProperties(properties, configuration.parallelProperties)
  const data = buildParallelData(matchingExperiments(experiments, matchingIds), axes)
  const selected = new Set(selectedIds)
  return <section id={id} className="parallel-view" aria-label="Parallel coordinates">
    {showControls && <div id={`${id}-controls`} className="chart-controls">
      <ChartTypeSelect value="parallel" onChange={chartType => onChartAction({ type: 'chart-type', chartType })} />
      <PropertyMultiSelect label="Axes · left to right" properties={properties} value={configuration.parallelProperties} ordered
        onChange={propertyIds => onChartAction({ type: 'parallel-properties', propertyIds })} />
    </div>}
    {axes.length < 2 || !data.lines.length ? <div className="empty-state">
      <h3>{axes.length < 2 ? 'Choose at least two properties' : data.omittedCount ? 'No complete experiments' : 'No matching experiments'}</h3>
      <p>{axes.length < 2 ? 'Choose inputs and outputs, then arrange the axes to explore patterns across experiments.'
        : data.omittedCount ? `${data.omittedCount} experiments are missing a value on at least one selected axis. Choose fewer properties to include more experiments.`
          : 'Adjust your search or filters to compare experiments.'}</p>
      {isFiltered && <button className="button" onClick={onResetQuery}>Reset search and filters</button>}
    </div> : <>
      <div className="chart-summary" role="status"><p><strong>{data.lines.length} experiments · {axes.length} axes</strong>
        {data.omittedCount > 0 && ` · ${data.omittedCount} omitted: missing values`}</p>
        <span className="chart-legend"><span className="chart-legend-dot" />All matching<span className="chart-legend-dot selected" />Selected subset</span>
      </div>
      <ParallelCoordinatesPlot dimensions={data.dimensions} lines={data.lines} selectedIds={selectedIds} onOpen={onOpen} />
      <details className="chart-data"><summary>View experiment values ({data.lines.length})</summary>
        <div className="chart-data-scroll" tabIndex={0} role="region" aria-label="Parallel coordinates values">
          <table><caption className="sr-only">Recorded values in the same order as the parallel coordinate axes</caption>
            <thead><tr><th scope="col">Experiment</th>{axes.map(axis => <th scope="col" key={axis.id}>{axis.name} ({axis.group === 'inputs' ? 'Input' : 'Output'})</th>)}</tr></thead>
            <tbody>{data.lines.map(line => <tr key={line.id}><th scope="row"><button className="text-button" onClick={() => onOpen(line.id)}>{line.label}</button>{selected.has(line.id) && ' · Selected'}</th>
              {line.values.map((value, index) => <td key={axes[index]!.id}>{formatValue(value)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    </>}
  </section>
}
