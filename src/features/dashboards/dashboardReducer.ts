import type { Dashboard, DashboardTemplate, DashboardWidget } from '../../dashboards/types.ts'
import { applyDashboardTemplate, templateSize } from '../../dashboards/layout.ts'
import { reorderById } from '../../components/reorder.ts'
import { reduceChartConfiguration, type ChartAction } from '../charts/chartConfiguration.ts'

export interface DashboardDraft {
  dashboard: Dashboard
}

export type DashboardAction =
  | { type: 'name'; value: string }
  | { type: 'add-widget'; widget: DashboardWidget }
  | { type: 'update-widget'; id: string; patch: Partial<Pick<DashboardWidget, 'title' | 'size' | 'plotFilter'>> }
  | { type: 'chart'; id: string; action: ChartAction }
  | { type: 'remove-widget'; id: string }
  | { type: 'reorder-widget'; id: string; targetId: string }
  | { type: 'template'; template: DashboardTemplate }

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
      const updated = updateWidget(action.id, widget => ({ ...widget, ...action.patch }))
      const current = dashboard.widgets.find(widget => widget.id === action.id)
      return current && action.patch.size && action.patch.size !== current.size
        ? { ...updated, dashboard: { ...updated.dashboard, layout: 'custom' } } : updated
    }
    case 'chart': return updateWidget(action.id, widget => ({ ...widget, configuration: reduceChartConfiguration(widget.configuration, action.action) }))
    case 'remove-widget': {
      if (!dashboard.widgets.some(widget => widget.id === action.id)) return state
      const remaining = { ...dashboard, widgets: dashboard.widgets.filter(widget => widget.id !== action.id) }
      return { ...state, dashboard: dashboard.layout === 'custom' ? remaining : applyDashboardTemplate(remaining, dashboard.layout) }
    }
    case 'reorder-widget': {
      const widgets = reorderById(dashboard.widgets, action.id, action.targetId)
      return widgets === dashboard.widgets ? state : replace({ widgets, layout: 'custom' })
    }
    case 'template': return { ...state, dashboard: applyDashboardTemplate(dashboard, action.template) }
  }
}

export function dashboardIsDirty(dashboard: Dashboard, saved: readonly Dashboard[]): boolean {
  return JSON.stringify(dashboard) !== JSON.stringify(saved.find(item => item.id === dashboard.id))
}
