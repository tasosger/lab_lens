import { DEFAULT_ORBIT_CAMERA, normalizeCamera, type OrbitCamera } from '../../charts/projection3D.ts'
import type { PropertyDefinition, PropertyId } from '../../data/types.ts'
import { defaultChartAxes, defaultChartZ, type ChartAxes } from './scatterData.ts'

export interface ChartConfiguration {
  chartMode: '2d' | '3d'
  chartAxes: ChartAxes
  chartZ: PropertyId | null
  chartCamera: OrbitCamera
}

export type ChartAction =
  | { type: 'chart-mode'; mode: '2d' | '3d' }
  | { type: 'chart-axis'; axis: 'x' | 'y'; propertyId: PropertyId }
  | { type: 'chart-z'; propertyId: PropertyId }
  | { type: 'chart-camera'; camera: OrbitCamera }
  | { type: 'swap-chart-axes'; pair?: 'xy' | 'xz' | 'yz' }

export function createChartConfiguration(properties: readonly PropertyDefinition[]): ChartConfiguration {
  return { chartMode: '2d', chartAxes: defaultChartAxes(properties), chartZ: defaultChartZ(properties), chartCamera: DEFAULT_ORBIT_CAMERA }
}

/** Shared by the standalone Charts view and every independent dashboard widget. */
export function reduceChartConfiguration<T extends ChartConfiguration>(state: T, action: ChartAction): T {
  switch (action.type) {
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
