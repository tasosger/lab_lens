import type { ComponentType } from 'react'
import type { ChartType } from '../../chart-model/types'
import type { ChartViewProps } from './ChartViewProps'
import { HistogramView } from './HistogramView'
import { ScatterPlotView } from './ScatterPlotView'
import { PieChartView } from './PieChartView'
import { CorrelationHeatmapView } from './CorrelationHeatmapView'
import { ParallelCoordinatesView } from './ParallelCoordinatesView'

function ScatterChart({ configuration, onChartAction, ...common }: ChartViewProps) {
  return <ScatterPlotView {...common} axes={configuration.chartAxes}
    onTypeChange={chartType => onChartAction({ type: 'chart-type', chartType })}
    onAxisChange={(axis, propertyId) => onChartAction({ type: 'chart-axis', axis, propertyId })}
    onSwapAxes={pair => onChartAction({ type: 'swap-chart-axes', pair })} />
}

function HistogramChart({ configuration, onChartAction, ...common }: ChartViewProps) {
  return <HistogramView {...common} propertyId={configuration.histogramProperty} binCount={configuration.histogramBins}
    onTypeChange={chartType => onChartAction({ type: 'chart-type', chartType })}
    onPropertyChange={propertyId => onChartAction({ type: 'histogram-property', propertyId })}
    onBinCountChange={bins => onChartAction({ type: 'histogram-bins', bins })} />
}

/** Exhaustive renderer registration; no silent fallback when a chart type is added. */
export const chartRenderers = {
  scatterplot: ScatterChart,
  histogram: HistogramChart,
  pie: PieChartView,
  heatmap: CorrelationHeatmapView,
  parallel: ParallelCoordinatesView,
} satisfies Record<ChartType, ComponentType<ChartViewProps>>
