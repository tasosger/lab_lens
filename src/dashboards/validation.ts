import { queryExperiments } from '../data/query.ts'
import type { FilterExpression, PropertyDefinition, PropertyId } from '../data/types.ts'
import { normalizeCamera } from '../charts/projection3D.ts'
import type { CartesianRange } from '../charts/types.ts'
import type { ChartConfiguration } from '../features/charts/chartConfiguration.ts'
import type { PropertyRangeFilter } from '../features/charts/propertyRangeFilter.ts'
import type { Dashboard, DashboardStore, DashboardWidget } from './types.ts'

export class DashboardValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'DashboardValidationError' }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DashboardValidationError('Invalid dashboard structure.')
  return value as Record<string, unknown>
}

function text(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new DashboardValidationError(`${label} is required.`)
  return value
}

function timestamp(value: unknown): string {
  const result = text(value, 'Timestamp')
  if (!Number.isFinite(Date.parse(result))) throw new DashboardValidationError('Invalid dashboard timestamp.')
  return result
}

function range(value: unknown): CartesianRange {
  const source = record(value)
  const pair = (input: unknown): readonly [number, number] => {
    if (!Array.isArray(input) || input.length !== 2 || !input.every(v => typeof v === 'number' && Number.isFinite(v)) || input[0] > input[1]) {
      throw new DashboardValidationError('Invalid plot range.')
    }
    return [input[0], input[1]]
  }
  return { x: pair(source.x), y: pair(source.y) }
}

/** Decode only persisted fields; UI objects and derived experiment data never enter storage. */
export function validateDashboard(value: unknown, properties: readonly PropertyDefinition[]): Dashboard {
  const source = record(value)
  const propertiesById = new Map(properties.map(p => [p.id, p]))
  function property(value: unknown, nullable = false): PropertyId | null {
    if (nullable && value === null) return null
    if (typeof value !== 'string' || !propertiesById.has(value as PropertyId)) throw new DashboardValidationError(`Unknown chart property: ${String(value)}`)
    return value as PropertyId
  }
  function configuration(value: unknown): ChartConfiguration {
    const config = record(value)
    const axes = record(config.chartAxes)
    const camera = record(config.chartCamera)
    if (config.chartMode !== '2d' && config.chartMode !== '3d') throw new DashboardValidationError('Unknown chart type.')
    if (![camera.yaw, camera.pitch, camera.zoom].every(v => typeof v === 'number' && Number.isFinite(v))) throw new DashboardValidationError('Invalid 3D camera.')
    return {
      chartMode: config.chartMode,
      chartAxes: { x: property(axes.x, true), y: property(axes.y, true) },
      chartZ: property(config.chartZ, true),
      chartCamera: normalizeCamera({ yaw: camera.yaw as number, pitch: camera.pitch as number, zoom: camera.zoom as number }),
    }
  }
  function plotFilter(value: unknown): PropertyRangeFilter | null {
    if (value === null) return null
    const filter = record(value)
    return { xPropertyId: property(filter.xPropertyId)!, yPropertyId: property(filter.yPropertyId)!, range: range(filter.range) }
  }
  if (!Array.isArray(source.widgets)) throw new DashboardValidationError('Invalid dashboard plots.')
  const ids = new Set<string>()
  const widgets: DashboardWidget[] = source.widgets.map(value => {
    const widget = record(value)
    const id = text(widget.id, 'Plot ID')
    if (ids.has(id)) throw new DashboardValidationError('Duplicate plot ID.')
    ids.add(id)
    if (widget.size !== 'half' && widget.size !== 'full') throw new DashboardValidationError('Invalid plot size.')
    return { id, title: text(widget.title, 'Plot title').trim(), size: widget.size, configuration: configuration(widget.configuration), plotFilter: plotFilter(widget.plotFilter) }
  })
  if (!Array.isArray(source.filters)) throw new DashboardValidationError('Invalid dashboard filters.')
  const filters = structuredClone(source.filters) as FilterExpression[]
  try { queryExperiments([], propertiesById, { filters }) }
  catch { throw new DashboardValidationError('Dashboard filters contain invalid conditions or unknown properties.') }
  return {
    id: text(source.id, 'Dashboard ID'), name: text(source.name, 'Dashboard name').trim(),
    search: text(source.search, 'Search', true), filters, widgets,
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
