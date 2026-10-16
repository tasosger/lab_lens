import type { Dashboard, DashboardTemplate, DashboardWidget } from '../../dashboards/types.ts'
import { applyDashboardTemplate, templateSize } from '../../dashboards/layout.ts'
import { reorderById } from '../../components/reorder.ts'
import { isPlotDimensions, type PlotDimensions } from '../../dashboards/packing.ts'
import { reduceChartConfiguration, type ChartAction } from '../../chart-model/configuration.ts'

export interface DashboardDraft {
  dashboard: Dashboard
}

export type DashboardAction =
  | { type: 'name'; value: string }
  | { type: 'add-widget'; widget: DashboardWidget }
  | { type: 'update-widget'; id: string; patch: Partial<Pick<DashboardWidget, 'title' | 'size'>> }
  | { type: 'chart'; id: string; action: ChartAction }
  | { type: 'remove-widget'; id: string }
  | { type: 'reorder-widget'; id: string; targetId: string; fit?: Partial<PlotDimensions> }
  | { type: 'template'; template: DashboardTemplate }
  | { type: 'resize-widget'; id: string; dimensions: PlotDimensions }
  | { type: 'reset-widget-size'; id: string }

export function createDashboardDraft(dashboard: Dashboard): DashboardDraft {
  return { dashboard }
}

export function dashboardReducer(state: DashboardDraft, action: DashboardAction): DashboardDraft {
  const { dashboard } = state
  const replace = (change: Partial<Dashboard>) => ({ ...state, dashboard: { ...dashboard, ...change } })
  const updateWidget = (id: string, update: (widget: DashboardWidget) => DashboardWidget) => dashboard.widgets.some(widget => widget.id === id)
    ? replace({ widgets: dashboard.widgets.map(widget => widget.id === id ? update(widget) : widget) }) : state
  switch (action.type) {
    case 'name': return replace({ name: action.value })
    case 'add-widget': return dashboard.widgets.some(widget => widget.id === action.widget.id)
      ? state : replace({ widgets: [...dashboard.widgets, { ...action.widget, size: templateSize(dashboard.layout, dashboard.widgets.length, action.widget.size) }] })
    case 'update-widget': {
      const updated = updateWidget(action.id, widget => {
        const { columns: _columns, ...withoutColumns } = widget
        return { ...(action.patch.size ? withoutColumns : widget), ...action.patch }
      })
      const current = dashboard.widgets.find(widget => widget.id === action.id)
      return current && action.patch.size && action.patch.size !== current.size
        ? { ...updated, dashboard: { ...updated.dashboard, layout: 'custom' } } : updated
    }
    case 'resize-widget': {
      const current = dashboard.widgets.find(widget => widget.id === action.id)
      if (!current || !isPlotDimensions(action.dimensions)
        || (current.columns === action.dimensions.columns && current.plotHeight === action.dimensions.plotHeight)) return state
      const updated = updateWidget(action.id, widget => ({ ...widget, ...action.dimensions, size: action.dimensions.columns === 12 ? 'full' : 'half' }))
      return { ...updated, dashboard: { ...updated.dashboard, layout: 'custom' } }
    }
    case 'reset-widget-size': return updateWidget(action.id, ({ columns: _columns, plotHeight: _height, ...widget }) => ({ ...widget, size: 'half' }))
    case 'chart': return updateWidget(action.id, widget => ({ ...widget, configuration: reduceChartConfiguration(widget.configuration, action.action) }))
    case 'remove-widget': {
      if (!dashboard.widgets.some(widget => widget.id === action.id)) return state
      const remaining = { ...dashboard, widgets: dashboard.widgets.filter(widget => widget.id !== action.id) }
      return { ...state, dashboard: dashboard.layout === 'custom' ? remaining : applyDashboardTemplate(remaining, dashboard.layout) }
    }
    case 'reorder-widget': {
      const widgets = reorderById(dashboard.widgets, action.id, action.targetId)
      if (widgets === dashboard.widgets) return state
      const fit = action.fit ?? {}
      if (!isPlotDimensions({ columns: fit.columns ?? 6, plotHeight: fit.plotHeight ?? 360 })) return state
      const fitted = fit.columns !== undefined || fit.plotHeight !== undefined ? widgets.map(widget => widget.id === action.id
        ? { ...widget, ...fit, size: fit.columns === undefined ? widget.size : fit.columns === 12 ? 'full' as const : 'half' as const } : widget) : widgets
      return replace({ widgets: fitted, layout: 'custom' })
    }
    case 'template': return { ...state, dashboard: applyDashboardTemplate(dashboard, action.template) }
  }
}

export function dashboardIsDirty(dashboard: Dashboard, saved: readonly Dashboard[]): boolean {
  return JSON.stringify(dashboard) !== JSON.stringify(saved.find(item => item.id === dashboard.id))
}
