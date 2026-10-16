import type { PropertyDefinition } from '../data/types.ts'
import { validateChartConfiguration } from '../chart-model/validation.ts'
import { ChartValidationError } from '../chart-model/validationContext.ts'
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
  function configuration(value: unknown) {
    try { return validateChartConfiguration(value, properties) }
    catch (error) {
      if (error instanceof ChartValidationError) throw new DashboardValidationError(error.message)
      throw error
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
