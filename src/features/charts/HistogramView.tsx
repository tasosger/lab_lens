import { useState } from 'react'
import { HistogramPlot } from '../../charts/HistogramPlot'
import { MAX_HISTOGRAM_BINS, histogramBinLabel, type HistogramBin, type HistogramBinCount } from '../../charts/histogram'
import { PropertySelect } from '../../components/PropertySelect'
import type { Experiment, PropertyDefinition, PropertyId } from '../../data'
import { formatValue } from '../experiments/format'
import { ChartTypeSelect } from './ChartTypeSelect'
import type { ChartType } from './chartConfiguration'
import { buildExperimentHistogram } from './histogramData'
import './scatterView.css'

const binKey = (bin: HistogramBin) => `${bin.lower}:${bin.upper}`

export function HistogramView({ id, showControls = true, experiments, matchingIds, properties, propertyId, binCount, selectedIds,
  isFiltered, onTypeChange, onPropertyChange, onBinCountChange, onOpen, onResetQuery }: {
  id: string
  showControls?: boolean
  experiments: readonly Experiment[]
  matchingIds: readonly string[]
  properties: readonly PropertyDefinition[]
  propertyId: PropertyId | null
  binCount: HistogramBinCount
  selectedIds: readonly string[]
  isFiltered: boolean
  onTypeChange: (type: ChartType) => void
  onPropertyChange: (id: PropertyId) => void
  onBinCountChange: (count: HistogramBinCount) => void
  onOpen: (id: string) => void
  onResetQuery: () => void
}) {
  const [inspected, setInspected] = useState<string | null>(null)
  const property = properties.find(item => item.id === propertyId)
  const data = property ? buildExperimentHistogram(experiments, property, binCount, matchingIds) : undefined
  const selected = new Set(selectedIds)
  const inspectedBin = data?.bins.find(bin => `${propertyId}:${binKey(bin)}` === inspected)
  const inspect = (bin: HistogramBin) => setInspected(`${propertyId}:${binKey(bin)}`)

  return (
    <section id={id} className="histogram-view" aria-label="Histogram">
      {showControls && <div id={`${id}-controls`} className="chart-controls">
        <ChartTypeSelect value="histogram" onChange={onTypeChange} />
        <PropertySelect label="Property" properties={properties} value={propertyId} onChange={onPropertyChange} />
        <label className="property-select histogram-bins"><span>Bins</span>
          <select value={binCount} onChange={event => onBinCountChange(event.target.value === 'auto' ? 'auto' : Number(event.target.value))}>
            <option value="auto">Auto</option>
            {Array.from({ length: MAX_HISTOGRAM_BINS }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </select>
        </label>
      </div>}
      {!property ? (
        <div className="empty-state"><h3>Choose a property</h3><p>Select an input or output to see its distribution.</p></div>
      ) : !data?.count ? (
        <div className="empty-state">
          <h3>{data?.omittedCount ? 'No recorded values' : isFiltered ? 'No matching experiments' : 'No experiments available'}</h3>
          <p>{data?.omittedCount ? `${data.omittedCount} matching experiments have no recorded value for ${property.name}. Choose another property.`
            : isFiltered ? 'Adjust your search or filters to see the distribution.' : 'The dataset does not contain any experiments yet.'}</p>
          {isFiltered && <button className="button" onClick={onResetQuery}>Reset search and filters</button>}
        </div>
      ) : (
        <>
          <div className="chart-summary" role="status">
            <p><strong>{data.count} experiments · {data.bins.length} {data.bins.length === 1 ? 'bin' : 'bins'}</strong>
              {data.omittedCount > 0 && ` · ${data.omittedCount} omitted: missing values`}</p>
            <span className="chart-legend"><span className="chart-legend-dot" />All matching<span className="chart-legend-dot selected" />Selected subset</span>
          </div>
          <div className="chart-surface">
            <HistogramPlot key={`${property.id}:${binCount}:${data.domain.join(':')}`} data={data} label={property.name} selectedIds={selectedIds}
              selectedBin={inspectedBin} onSelectBin={inspect} formatValue={formatValue} />
          </div>
          {inspectedBin && (
            <section className="histogram-inspector" aria-label="Experiments in selected bin">
              <div className="histogram-inspector-heading"><h3>{histogramBinLabel(inspectedBin, formatValue)}</h3>
                <button className="text-button" onClick={() => setInspected(null)}>Close bin details</button></div>
              <p role="status">{inspectedBin.items.length} experiments in this bin</p>
              {inspectedBin.items.length ? (
                <ul>{inspectedBin.items.map(item => <li key={item.id}>
                  <button className="text-button" onClick={() => onOpen(item.id)}>{item.label}</button>
                  <span>{formatValue(item.value)}{selected.has(item.id) && ' · Selected'}</span>
                </li>)}</ul>
              ) : <p>This range contains no matching experiments.</p>}
            </section>
          )}
          <details className="chart-data">
            <summary>View bin counts ({data.bins.length})</summary>
            <div className="chart-data-scroll" tabIndex={0} role="region" aria-label="Histogram bin counts">
              <table><caption className="sr-only">{property.name} ranges and experiment counts. Selected counts are included in the total.</caption>
                <thead><tr><th scope="col">Range</th><th scope="col">Experiments</th><th scope="col">Selected</th></tr></thead>
                <tbody>{data.bins.map(bin => <tr key={binKey(bin)}>
                  <th scope="row"><button className="text-button" aria-pressed={inspectedBin === bin} onClick={() => inspect(bin)}>{histogramBinLabel(bin, formatValue)}</button></th>
                  <td>{bin.items.length}</td><td>{bin.items.filter(item => selected.has(item.id)).length}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  )
}
