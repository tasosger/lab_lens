import type { PropertyDefinition } from '../data/types.ts'
import { normalizeCamera } from '../charts/projection3D.ts'
import { createChartConfiguration } from './configuration.ts'
import { chartDefinitions, isChartType } from './registry.ts'
import type { ChartConfiguration } from './types.ts'
import { chartRecord, ChartValidationError, createChartReader } from './validationContext.ts'

/** Decode chart settings independently of dashboards or React. Unknown fields are discarded. */
export function validateChartConfiguration(value: unknown, properties: readonly PropertyDefinition[]): ChartConfiguration {
  const source = chartRecord(value)
  const defaults = createChartConfiguration(properties)
  const reader = createChartReader(properties)
  const chartType = source.chartType === undefined ? 'scatterplot' : source.chartType
  const hideZeroInputs = source.hideZeroInputs === undefined ? false : source.hideZeroInputs
  if (!isChartType(chartType)) throw new ChartValidationError('Unknown chart type.')
  if (typeof hideZeroInputs !== 'boolean') throw new ChartValidationError('Invalid zero-input visibility setting.')

  // Older dashboards retain their camera and Z settings, but render as 2D scatterplots.
  if (source.chartMode !== '2d' && source.chartMode !== '3d') throw new ChartValidationError('Unknown chart type.')
  const camera = chartRecord(source.chartCamera)
  if (![camera.yaw, camera.pitch, camera.zoom].every(value => typeof value === 'number' && Number.isFinite(value))) throw new ChartValidationError('Invalid 3D camera.')
  if (camera.pan !== undefined && (!Array.isArray(camera.pan) || camera.pan.length !== 2 || !camera.pan.every(value => typeof value === 'number' && Number.isFinite(value)))) {
    throw new ChartValidationError('Invalid 3D camera position.')
  }
  return {
    chartType, hideZeroInputs,
    ...chartDefinitions.scatterplot.decode(source, defaults, reader),
    ...chartDefinitions.histogram.decode(source, defaults, reader),
    ...chartDefinitions.pie.decode(source, defaults, reader),
    ...chartDefinitions.heatmap.decode(source, defaults, reader),
    ...chartDefinitions.parallel.decode(source, defaults, reader),
    chartMode: source.chartMode, chartZ: reader.optionalProperty(source.chartZ),
    chartCamera: normalizeCamera({ yaw: camera.yaw as number, pitch: camera.pitch as number, zoom: camera.zoom as number,
      ...(camera.pan === undefined ? {} : { pan: camera.pan as [number, number] }) }),
  }
}
