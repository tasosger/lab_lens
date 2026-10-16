import type { OrbitCamera } from '../charts/projection3D.ts'
import type { PropertyId } from '../data/types.ts'
import type { HistogramBinCount } from '../charts/histogram.ts'
import type { PieGrouping } from '../charts/pie.ts'

export type ChartType = keyof ChartSettingsByType

export interface ChartAxes {
  readonly x: PropertyId | null
  readonly y: PropertyId | null
}

export type AxisSwap = 'xy' | 'xz' | 'yz'

export interface ChartConfiguration {
  chartType: ChartType
  hideZeroInputs: boolean
  histogramProperty: PropertyId | null
  histogramBins: HistogramBinCount
  pieProperty: PropertyId | null
  pieGrouping: PieGrouping
  pieBins: HistogramBinCount
  heatmapX: PropertyId[]
  heatmapY: PropertyId[]
  parallelProperties: PropertyId[]
  chartMode: '2d' | '3d'
  chartAxes: ChartAxes
  chartZ: PropertyId | null
  chartCamera: OrbitCamera
}

export type ChartAction =
  | { type: 'chart-type'; chartType: ChartType }
  | { type: 'hide-zero-inputs'; value: boolean }
  | { type: 'histogram-property'; propertyId: PropertyId }
  | { type: 'histogram-bins'; bins: HistogramBinCount }
  | { type: 'pie-property'; propertyId: PropertyId }
  | { type: 'pie-grouping'; grouping: PieGrouping }
  | { type: 'pie-bins'; bins: HistogramBinCount }
  | { type: 'heatmap-axis'; axis: 'x' | 'y'; propertyIds: readonly PropertyId[] }
  | { type: 'inspect-heatmap-cell'; xPropertyId: PropertyId; yPropertyId: PropertyId }
  | { type: 'parallel-properties'; propertyIds: readonly PropertyId[] }
  | { type: 'chart-mode'; mode: '2d' | '3d' }
  | { type: 'chart-axis'; axis: 'x' | 'y'; propertyId: PropertyId }
  | { type: 'chart-z'; propertyId: PropertyId }
  | { type: 'chart-camera'; camera: OrbitCamera }
  | { type: 'swap-chart-axes'; pair?: AxisSwap }

/** Settings contributed by each chart. The flat shape preserves saved v1 dashboards. */
export interface ChartSettingsByType {
  scatterplot: Pick<ChartConfiguration, 'chartAxes'>
  histogram: Pick<ChartConfiguration, 'histogramProperty' | 'histogramBins'>
  pie: Pick<ChartConfiguration, 'pieProperty' | 'pieGrouping' | 'pieBins'>
  heatmap: Pick<ChartConfiguration, 'heatmapX' | 'heatmapY'>
  parallel: Pick<ChartConfiguration, 'parallelProperties'>
}
