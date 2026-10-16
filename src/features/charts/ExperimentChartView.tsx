import type { CartesianRange } from '../../charts/types'
import type { Experiment, PropertyDefinition } from '../../data'
import type { ChartAction, ChartConfiguration } from './chartConfiguration'
import type { PropertyRangeFilter } from './propertyRangeFilter'
import { HistogramView } from './HistogramView'
import { ScatterPlotView } from './ScatterPlotView'
import { PieChartView } from './PieChartView'
import { CorrelationHeatmapView } from './CorrelationHeatmapView'
import { ParallelCoordinatesView } from './ParallelCoordinatesView'
import { chartIngredientInputs, excludeChartZeroInputs } from './inputPresence'
import './inputPresence.css'

/** One chart dispatcher for the Charts page and saved dashboard widgets. */
export function ExperimentChartView({ id = 'charts', filterTarget, showControls = true, configuration, onChartAction, experiments, matchingIds,
  selectedIds, properties, rangeSelection, hasPlotFilter, isFiltered, onPlotFilter, onOpen, onResetQuery }: {
  id?: string
  filterTarget?: string
  showControls?: boolean
  configuration: ChartConfiguration
  onChartAction: (action: ChartAction) => void
  experiments: readonly Experiment[]
  matchingIds: readonly string[]
  selectedIds: readonly string[]
  properties: readonly PropertyDefinition[]
  rangeSelection: CartesianRange | null
  hasPlotFilter: boolean
  isFiltered: boolean
  onPlotFilter: (filter: PropertyRangeFilter | null) => void
  onOpen: (id: string) => void
  onResetQuery: () => void
}) {
  const filteredExperiments = excludeChartZeroInputs(experiments, configuration, properties)
  const activeInputs = chartIngredientInputs(configuration, properties)
  const matching = new Set(matchingIds)
  const excludedCount = experiments.filter(experiment => matching.has(experiment.id)).length
    - filteredExperiments.filter(experiment => matching.has(experiment.id)).length
  const reset = () => { onChartAction({ type: 'hide-zero-inputs', value: false }); onResetQuery() }
  const common = { id, showControls, experiments: filteredExperiments, matchingIds, selectedIds, properties,
    isFiltered: isFiltered || (configuration.hideZeroInputs && activeInputs.length > 0), onOpen, onResetQuery: reset }
  const onTypeChange = (chartType: ChartConfiguration['chartType']) => onChartAction({ type: 'chart-type', chartType })
  const analysisProps = { ...common, configuration, onChartAction }
  const chart = configuration.chartType === 'pie' ? <PieChartView {...analysisProps} />
    : configuration.chartType === 'heatmap' ? <CorrelationHeatmapView {...analysisProps} />
    : configuration.chartType === 'parallel' ? <ParallelCoordinatesView {...analysisProps} />
    : configuration.chartType === 'histogram' ? (
    <HistogramView {...common} propertyId={configuration.histogramProperty} binCount={configuration.histogramBins}
      onTypeChange={onTypeChange} onPropertyChange={propertyId => onChartAction({ type: 'histogram-property', propertyId })}
      onBinCountChange={bins => onChartAction({ type: 'histogram-bins', bins })} />
  ) : (
    <ScatterPlotView {...common} filterTarget={filterTarget} rangeSelection={rangeSelection} hasPlotFilter={hasPlotFilter}
      onPlotFilter={onPlotFilter} onTypeChange={onTypeChange} axes={configuration.chartAxes} mode={configuration.chartMode}
      zPropertyId={configuration.chartZ} camera={configuration.chartCamera}
      onAxisChange={(axis, propertyId) => onChartAction({ type: 'chart-axis', axis, propertyId })}
      onSwapAxes={pair => onChartAction({ type: 'swap-chart-axes', pair })}
      onModeChange={mode => onChartAction({ type: 'chart-mode', mode })}
      onZChange={propertyId => onChartAction({ type: 'chart-z', propertyId })}
      onCameraChange={camera => onChartAction({ type: 'chart-camera', camera })} />
  )
  return <>
    {activeInputs.length > 0 && <div className="chart-zero-filter">
      <label className="zero-input-toggle" title={configuration.chartType === 'heatmap'
        ? 'Exclude zero ingredient amounts separately for each cell’s property pair.'
        : `Exclude experiments with a zero amount for: ${activeInputs.map(property => property.name).join(', ')}.`}>
        <input type="checkbox" checked={configuration.hideZeroInputs}
          onChange={event => onChartAction({ type: 'hide-zero-inputs', value: event.target.checked })} />
        Exclude zero inputs
      </label>
      {configuration.hideZeroInputs && <span role="status">{configuration.chartType === 'heatmap' ? 'Per cell' : `${excludedCount} excluded`}</span>}
    </div>}
    {chart}
  </>
}
