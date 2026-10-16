import { ChartDataTable } from '../../charts/ChartDataTable'
import { ScatterPlot } from '../../charts/ScatterPlot'
import type { Experiment, PropertyDefinition, PropertyId } from '../../data'
import { formatValue } from '../experiments/format'
import { Icon } from '../experiments/Icon'
import { buildScatterData, type ChartAxes } from './scatterData'
import type { AxisSwap } from './AxisSwapMenu'
import { ScatterPlotControls } from './ScatterPlotControls'
import type { ChartType } from './chartConfiguration'
import './scatterView.css'

interface ScatterPlotViewProps {
  onTypeChange: (type: ChartType) => void
  id?: string
  showControls?: boolean
  experiments: readonly Experiment[]
  matchingIds: readonly string[]
  properties: readonly PropertyDefinition[]
  axes: ChartAxes
  selectedIds: readonly string[]
  isFiltered: boolean
  onAxisChange: (axis: 'x' | 'y', propertyId: PropertyId) => void
  onSwapAxes: (pair: AxisSwap) => void
  onOpen: (id: string) => void
  onResetQuery: () => void
}

export function ScatterPlotView({ id = 'charts', showControls = true, experiments, matchingIds, properties, axes, selectedIds, isFiltered, onAxisChange, onSwapAxes, onOpen, onResetQuery, onTypeChange }: ScatterPlotViewProps) {
  const xProperty = properties.find((property) => property.id === axes.x)
  const yProperty = properties.find((property) => property.id === axes.y)
  const matching = new Set(matchingIds)
  const matchingExperiments = experiments.filter(experiment => matching.has(experiment.id))
  const data = xProperty && yProperty ? buildScatterData(matchingExperiments, xProperty, yProperty) : undefined

  return (
    <section id={id} className="scatter-view" aria-label="Scatterplot">
      {showControls && <div id={`${id}-controls`}><ScatterPlotControls properties={properties} axes={axes}
        onAxisChange={onAxisChange} onSwapAxes={onSwapAxes} onTypeChange={onTypeChange} /></div>}

      {!xProperty || !yProperty ? (
        <div className="empty-state"><h3>No properties to plot</h3><p>The dataset needs numeric input or output properties to create a chart.</p></div>
      ) : !data?.points.length ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="chart" /></span>
          <h3>{matchingExperiments.length ? 'No complete pairs to plot' : isFiltered ? 'No matching experiments' : 'No experiments available'}</h3>
          <p>{matchingExperiments.length
            ? 'Choose different axes. These experiments are missing a value for at least one selected property.'
            : isFiltered ? 'Adjust your search or filters to see experiments in the chart.' : 'The dataset does not contain any experiments yet.'}</p>
          {isFiltered && <button className="button" onClick={onResetQuery}>Reset search and filters</button>}
        </div>
      ) : (
        <>
          <div className="chart-summary" role="status">
            <p><strong>{data.points.length} plotted</strong>{data.omittedCount > 0 && ` · ${data.omittedCount} omitted: missing an axis value`}</p>
            <span className="chart-legend"><span className="chart-legend-dot" />Experiment<span className="chart-legend-dot selected" />Selected</span>
          </div>
          <div className="chart-surface">
            <ScatterPlot key={`${xProperty.id}/${yProperty.id}`} points={data.points} xLabel={xProperty.name} yLabel={yProperty.name}
              highlightedIds={selectedIds}
              formatValue={formatValue} onPointActivate={onOpen} />
          </div>
          <p className="chart-help">Hover or focus a point for values; click or press Enter to open details.</p>
          <ChartDataTable points={data.points} xLabel={xProperty.name} yLabel={yProperty.name} itemLabel="Experiment" formatValue={formatValue} onPointActivate={onOpen} />
        </>
      )}
    </section>
  )
}
