import { useState } from 'react'
import { PiePlot } from '../../charts/PiePlot'
import { MAX_HISTOGRAM_BINS } from '../../charts/histogram'
import { buildPieData, pieColor } from '../../charts/pie'
import { PropertySelect } from '../../components/PropertySelect'
import { formatValue } from '../experiments/format'
import { matchingExperiments, propertyData } from './analysisData'
import { ChartTypeSelect } from './ChartTypeSelect'
import type { ChartViewProps } from './ChartViewProps'
import './analysisCharts.css'

export function PieChartView({ id, showControls, configuration, onChartAction, experiments, matchingIds, selectedIds,
  properties, isFiltered, onOpen, onResetQuery }: ChartViewProps) {
  const [inspected, setInspected] = useState<string | null>(null)
  const { pieProperty, pieGrouping, pieBins } = configuration
  const property = properties.find(p => p.id === pieProperty)
  const matching = matchingExperiments(experiments, matchingIds)
  const values = property ? propertyData(matching, property) : { items: [], omittedCount: 0 }
  const data = buildPieData(values.items, pieGrouping, pieBins, formatValue)
  const key = `${pieProperty}:${pieGrouping}:${pieBins}`
  const slice = data.slices.find(slice => `${key}:${slice.id}` === inspected)
  const selected = new Set(selectedIds)
  return <section id={id} className="pie-view" aria-label="Pie chart">
    {showControls && <div id={`${id}-controls`} className="chart-controls">
      <ChartTypeSelect value="pie" onChange={chartType => onChartAction({ type: 'chart-type', chartType })} />
      <PropertySelect label="Property" properties={properties} value={pieProperty} onChange={propertyId => onChartAction({ type: 'pie-property', propertyId })} />
      <label className="property-select"><span>Group experiments by</span>
        <select value={pieGrouping} onChange={event => onChartAction({ type: 'pie-grouping', grouping: event.target.value === 'values' ? 'values' : 'ranges' })}>
          <option value="ranges">Value ranges</option><option value="values">Exact values</option>
        </select>
      </label>
      {pieGrouping === 'ranges' && <label className="property-select histogram-bins"><span>Ranges</span>
        <select value={pieBins} onChange={event => onChartAction({ type: 'pie-bins', bins: event.target.value === 'auto' ? 'auto' : Number(event.target.value) })}>
          <option value="auto">Auto</option>
          {Array.from({ length: MAX_HISTOGRAM_BINS }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select>
      </label>}
    </div>}
    {!property || !data.count ? <div className="empty-state">
      <h3>{!property ? 'Choose a property' : values.omittedCount ? 'No recorded values' : 'No matching experiments'}</h3>
      <p>{!property ? 'Choose an input or output to group experiments into slices.' : values.omittedCount
        ? `${values.omittedCount} matching experiments have no recorded value for ${property.name}.` : 'Adjust your search or filters to see the distribution.'}</p>
      {isFiltered && <button className="button" onClick={onResetQuery}>Reset search and filters</button>}
    </div> : <>
      <div className="chart-summary" role="status"><p><strong>{property.name} · {data.count} experiments · {data.slices.length} slices</strong>
        {values.omittedCount > 0 && ` · ${values.omittedCount} omitted: missing values`}</p></div>
      <div className="pie-layout">
        <PiePlot slices={data.slices} selectedSliceId={slice?.id} onSelect={slice => setInspected(`${key}:${slice.id}`)} />
        <div className="pie-legend-scroll" tabIndex={0} role="region" aria-label="Pie chart counts">
          <table className="pie-legend"><caption className="sr-only">Experiment counts and percentages by {property.name}</caption>
            <thead><tr><th scope="col">{pieGrouping === 'values' ? 'Value' : 'Range'}</th><th scope="col">Count</th><th scope="col">Share</th><th scope="col">Selected</th></tr></thead>
            <tbody>{data.slices.map((item, index) => <tr key={item.id}>
              <th scope="row"><button className="text-button" aria-pressed={item.id === slice?.id} onClick={() => setInspected(`${key}:${item.id}`)}>
                <span className="pie-swatch" style={{ backgroundColor: pieColor(index) }} />{item.label}</button></th>
              <td>{item.items.length}</td><td>{(item.fraction * 100).toFixed(1)}%</td><td>{item.items.filter(item => selected.has(item.id)).length}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
      <p className="chart-help">Slices show the share of experiments with a recorded value for {property.name}. Click a slice or its label to inspect experiments.
        {data.slices.length > 10 && ' For fewer slices, group by value ranges and reduce the number of ranges.'}</p>
      {slice && <section className="histogram-inspector" aria-label="Experiments in selected slice">
        <div className="histogram-inspector-heading"><h3>{slice.label}</h3><button className="text-button" onClick={() => setInspected(null)}>Close slice details</button></div>
        <p role="status">{slice.items.length} experiments in this slice</p>
        <ul>{slice.items.map(item => <li key={item.id}><button className="text-button" onClick={() => onOpen(item.id)}>{item.label}</button>
          <span>{formatValue(item.value)}{selected.has(item.id) && ' · Selected'}</span></li>)}</ul>
      </section>}
    </>}
  </section>
}
