import type { CartesianRange } from '../../charts/types'
import type { Experiment, PropertyDefinition } from '../../data'
import type { ChartAction, ChartConfiguration } from './chartConfiguration'
import type { PropertyRangeFilter } from './propertyRangeFilter'
import { HistogramView } from './HistogramView'
import { ScatterPlotView } from './ScatterPlotView'
import { PieChartView } from './PieChartView'
import { CorrelationHeatmapView } from './CorrelationHeatmapView'
import { ParallelCoordinatesView } from './ParallelCoordinatesView'

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
  const common = { id, showControls, experiments, matchingIds, selectedIds, properties, isFiltered, onOpen, onResetQuery }
  const onTypeChange = (chartType: ChartConfiguration['chartType']) => onChartAction({ type: 'chart-type', chartType })
  const analysisProps = { ...common, configuration, onChartAction }
  if (configuration.chartType === 'pie') return <PieChartView {...analysisProps} />
  if (configuration.chartType === 'heatmap') return <CorrelationHeatmapView {...analysisProps} />
  if (configuration.chartType === 'parallel') return <ParallelCoordinatesView {...analysisProps} />
  return configuration.chartType === 'histogram' ? (
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
}
