import { DEFAULT_ORBIT_CAMERA, normalizeCamera } from '../charts/projection3D.ts'
import type { PropertyDefinition } from '../data/types.ts'
import { defaultChartZ } from './defaults.ts'
import { isHistogramBinCount } from '../charts/histogram.ts'
import { chartDefinitions } from './registry.ts'
import type { ChartAction, ChartConfiguration } from './types.ts'

/** Retain inactive settings so switching chart types never discards the user's choices. */
export function createChartConfiguration(properties: readonly PropertyDefinition[]): ChartConfiguration {
  return {
    chartType: 'scatterplot', hideZeroInputs: false,
    ...chartDefinitions.scatterplot.defaults(properties),
    ...chartDefinitions.histogram.defaults(properties),
    ...chartDefinitions.pie.defaults(properties),
    ...chartDefinitions.heatmap.defaults(properties),
    ...chartDefinitions.parallel.defaults(properties),
    // Kept for older saved dashboards; active scatterplots display X/Y only.
    chartMode: '2d', chartZ: defaultChartZ(properties), chartCamera: DEFAULT_ORBIT_CAMERA,
  }
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
