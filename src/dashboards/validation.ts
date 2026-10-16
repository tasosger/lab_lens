import type { PropertyDefinition, PropertyId } from '../data/types.ts'
import { normalizeCamera } from '../charts/projection3D.ts'
import { isHistogramBinCount } from '../charts/histogram.ts'
import { createChartConfiguration, isChartType, type ChartConfiguration } from '../features/charts/chartConfiguration.ts'
import type { Dashboard, DashboardStore, DashboardWidget } from './types.ts'
import { isDashboardLayout } from './layout.ts'
import { isPlotDimensions } from './packing.ts'

export class DashboardValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'DashboardValidationError' }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DashboardValidationError('Invalid dashboard structure.')
  return value as Record<string, unknown>
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new DashboardValidationError(`${label} is required.`)
  return value
}

function timestamp(value: unknown): string {
  const result = text(value, 'Timestamp')
  if (!Number.isFinite(Date.parse(result))) throw new DashboardValidationError('Invalid dashboard timestamp.')
  return result
}

/** Decode only persisted fields; UI objects and derived experiment data never enter storage. */
export function validateDashboard(value: unknown, properties: readonly PropertyDefinition[]): Dashboard {
  const source = record(value)
  // Older v1 dashboards already store individual widths; preserve their custom layout.
  const layout = source.layout === undefined ? 'custom' : source.layout
  if (!isDashboardLayout(layout)) throw new DashboardValidationError('Invalid dashboard layout.')
  const propertiesById = new Map(properties.map(p => [p.id, p]))
  function property(value: unknown, nullable = false): PropertyId | null {
    if (nullable && value === null) return null
    if (typeof value !== 'string' || !propertiesById.has(value as PropertyId)) throw new DashboardValidationError(`Unknown chart property: ${String(value)}`)
    return value as PropertyId
  }
  function configuration(value: unknown): ChartConfiguration {
    const config = record(value)
    const defaults = createChartConfiguration(properties)
    function propertyList(value: unknown, fallback: readonly PropertyId[]): PropertyId[] {
      if (value === undefined) return [...fallback]
      if (!Array.isArray(value)) throw new DashboardValidationError('Invalid chart property list.')
      const ids = value.map(id => property(id)!)
      if (new Set(ids).size !== ids.length) throw new DashboardValidationError('Duplicate chart property.')
      return ids
    }
    const axes = record(config.chartAxes)
    const camera = record(config.chartCamera)
    // Existing v1 dashboards predate histogram settings and remain scatterplots.
    const chartType = config.chartType === undefined ? 'scatterplot' : config.chartType
    const hideZeroInputs = config.hideZeroInputs === undefined ? false : config.hideZeroInputs
    if (typeof hideZeroInputs !== 'boolean') throw new DashboardValidationError('Invalid zero-input visibility setting.')
    const histogramBins = config.histogramBins === undefined ? 'auto' : config.histogramBins
    if (!isChartType(chartType)) throw new DashboardValidationError('Unknown chart type.')
    if (!isHistogramBinCount(histogramBins)) throw new DashboardValidationError('Invalid histogram bin count.')
    const pieGrouping = config.pieGrouping === undefined ? defaults.pieGrouping : config.pieGrouping
    const pieBins = config.pieBins === undefined ? defaults.pieBins : config.pieBins
    if (pieGrouping !== 'ranges' && pieGrouping !== 'values') throw new DashboardValidationError('Invalid pie grouping.')
    if (!isHistogramBinCount(pieBins)) throw new DashboardValidationError('Invalid pie bin count.')
    if (config.chartMode !== '2d' && config.chartMode !== '3d') throw new DashboardValidationError('Unknown chart type.')
    if (![camera.yaw, camera.pitch, camera.zoom].every(v => typeof v === 'number' && Number.isFinite(v))) throw new DashboardValidationError('Invalid 3D camera.')
    if (camera.pan !== undefined && (!Array.isArray(camera.pan) || camera.pan.length !== 2 || !camera.pan.every(v => typeof v === 'number' && Number.isFinite(v)))) {
      throw new DashboardValidationError('Invalid 3D camera position.')
    }
    return {
      chartType,
      hideZeroInputs,
      histogramBins,
      histogramProperty: property(config.histogramProperty === undefined ? axes.y : config.histogramProperty, true),
      pieProperty: property(config.pieProperty === undefined ? defaults.pieProperty : config.pieProperty, true),
      pieGrouping, pieBins,
      heatmapX: propertyList(config.heatmapX, defaults.heatmapX),
      heatmapY: propertyList(config.heatmapY, defaults.heatmapY),
      parallelProperties: propertyList(config.parallelProperties, defaults.parallelProperties),
      chartMode: config.chartMode,
      chartAxes: { x: property(axes.x, true), y: property(axes.y, true) },
      chartZ: property(config.chartZ, true),
      chartCamera: normalizeCamera({ yaw: camera.yaw as number, pitch: camera.pitch as number, zoom: camera.zoom as number,
        ...(camera.pan === undefined ? {} : { pan: camera.pan as [number, number] }) }),
    }
  }
  if (!Array.isArray(source.widgets)) throw new DashboardValidationError('Invalid dashboard plots.')
  const ids = new Set<string>()
  const widgets: DashboardWidget[] = source.widgets.map(value => {
    const widget = record(value)
    const id = text(widget.id, 'Plot ID')
    if (ids.has(id)) throw new DashboardValidationError('Duplicate plot ID.')
    ids.add(id)
    if (widget.size !== 'half' && widget.size !== 'full') throw new DashboardValidationError('Invalid plot size.')
    if ((widget.columns !== undefined || widget.plotHeight !== undefined)
      && !isPlotDimensions({ columns: widget.columns === undefined ? 6 : widget.columns as number, plotHeight: widget.plotHeight === undefined ? 360 : widget.plotHeight as number })) {
      throw new DashboardValidationError('Invalid plot dimensions.')
    }
    return { id, title: text(widget.title, 'Plot title').trim(), size: widget.size,
      ...(widget.columns === undefined ? {} : { columns: widget.columns as number }),
      ...(widget.plotHeight === undefined ? {} : { plotHeight: widget.plotHeight as number }),
      configuration: configuration(widget.configuration) }
  })
  // Legacy plot ranges and dashboard-wide filters are omitted so they cannot hide experiments.
  return {
    id: text(source.id, 'Dashboard ID'), name: text(source.name, 'Dashboard name').trim(), layout,
    widgets,
    createdAt: timestamp(source.createdAt), updatedAt: timestamp(source.updatedAt),
  }
}

export function decodeDashboardStore(raw: string, properties: readonly PropertyDefinition[]): DashboardStore {
  let source: Record<string, unknown>
  try { source = record(JSON.parse(raw)) }
  catch { throw new DashboardValidationError('Saved dashboards could not be read. Existing browser data has been kept.') }
  if (source.version !== 1) throw new DashboardValidationError('This dashboard storage version is not supported. Existing browser data has been kept.')
  if (!Array.isArray(source.dashboards)) throw new DashboardValidationError('Invalid saved dashboard collection.')
  const dashboards = source.dashboards.map(value => validateDashboard(value, properties))
  if (new Set(dashboards.map(d => d.id)).size !== dashboards.length) throw new DashboardValidationError('Duplicate dashboard ID.')
  return { version: 1, dashboards }
}
