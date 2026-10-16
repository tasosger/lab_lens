import { DEFAULT_ORBIT_CAMERA, normalizeCamera, type OrbitCamera } from '../../charts/projection3D.ts'
import type { PropertyDefinition, PropertyId } from '../../data/types.ts'
import { defaultChartAxes, defaultChartZ, type ChartAxes } from './scatterData.ts'
import { isHistogramBinCount, type HistogramBinCount } from '../../charts/histogram.ts'
import type { PieGrouping } from '../../charts/pie.ts'

const chartTypes = ['scatterplot', 'histogram', 'pie', 'heatmap', 'parallel'] as const
export type ChartType = typeof chartTypes[number]
export function isChartType(value: unknown): value is ChartType {
  return typeof value === 'string' && chartTypes.includes(value as ChartType)
}

export const SCATTERPLOT_VALUE_LIMIT = 3

/** Dimensionality follows the selected values; unsupported counts never reach the renderer. */
export function scatterplotModeForValueCount(count: number): '2d' | '3d' {
  if (count > SCATTERPLOT_VALUE_LIMIT) {
    throw new RangeError('Scatterplots support a maximum of 3 values. Remove the Z axis before adding another.')
  }
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError('Choose at least 2 values for a scatterplot.')
  }
  return count === 3 ? '3d' : '2d'
}

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
  | { type: 'swap-chart-axes'; pair?: 'xy' | 'xz' | 'yz' }

export function createChartConfiguration(properties: readonly PropertyDefinition[]): ChartConfiguration {
  const chartAxes = defaultChartAxes(properties)
  const inputs = properties.filter(property => property.group === 'inputs').map(property => property.id)
  const outputs = properties.filter(property => property.group === 'outputs').map(property => property.id)
  return { chartType: 'scatterplot', hideZeroInputs: false, histogramProperty: chartAxes.y, histogramBins: 'auto',
    pieProperty: chartAxes.x, pieGrouping: 'ranges', pieBins: 5,
    heatmapX: outputs.length ? outputs : inputs.slice(0, 1), heatmapY: inputs.length ? inputs : outputs,
    parallelProperties: [...new Set([chartAxes.x, chartAxes.y, inputs.find(id => id !== chartAxes.x), outputs.find(id => id !== chartAxes.y)]
      .filter((id): id is PropertyId => id !== null && id !== undefined))],
    chartMode: '2d', chartAxes, chartZ: defaultChartZ(properties), chartCamera: DEFAULT_ORBIT_CAMERA }
}

/** Shared by the standalone Charts view and every independent dashboard widget. */
export function reduceChartConfiguration<T extends ChartConfiguration>(state: T, action: ChartAction): T {
  switch (action.type) {
    case 'chart-type': return { ...state, chartType: action.chartType }
    case 'hide-zero-inputs': return { ...state, hideZeroInputs: action.value }
    case 'histogram-property': return { ...state, histogramProperty: action.propertyId }
    case 'histogram-bins': return isHistogramBinCount(action.bins) ? { ...state, histogramBins: action.bins } : state
    case 'pie-property': return { ...state, pieProperty: action.propertyId }
    case 'pie-grouping': return { ...state, pieGrouping: action.grouping }
    case 'pie-bins': return isHistogramBinCount(action.bins) ? { ...state, pieBins: action.bins } : state
    case 'heatmap-axis': return { ...state, [action.axis === 'x' ? 'heatmapX' : 'heatmapY']: [...new Set(action.propertyIds)] }
    case 'parallel-properties': return { ...state, parallelProperties: [...new Set(action.propertyIds)] }
    case 'inspect-heatmap-cell': return { ...state, chartType: 'scatterplot', chartMode: '2d', chartAxes: { x: action.xPropertyId, y: action.yPropertyId } }
    case 'chart-mode': return { ...state, chartMode: action.mode }
    case 'chart-axis': return { ...state, chartAxes: { ...state.chartAxes, [action.axis]: action.propertyId } }
    case 'chart-z': return { ...state, chartZ: action.propertyId }
    case 'chart-camera': return { ...state, chartCamera: normalizeCamera(action.camera) }
    case 'swap-chart-axes': {
      if (action.pair === 'xz') return { ...state, chartAxes: { ...state.chartAxes, x: state.chartZ }, chartZ: state.chartAxes.x }
      if (action.pair === 'yz') return { ...state, chartAxes: { ...state.chartAxes, y: state.chartZ }, chartZ: state.chartAxes.y }
      return { ...state, chartAxes: { x: state.chartAxes.y, y: state.chartAxes.x } }
    }
  }
}
