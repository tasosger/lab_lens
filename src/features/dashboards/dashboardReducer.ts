import type { Dashboard, DashboardWidget } from '../../dashboards/types.ts'
import { reduceChartConfiguration, type ChartAction } from '../charts/chartConfiguration.ts'
import { createFilterEditorState, filterEditorExpressions, reduceFilterEditor, type FilterEditorAction, type FilterEditorState } from '../experiments/filterEditorState.ts'

export interface DashboardDraft {
  dashboard: Dashboard
  filterEditor: FilterEditorState
}

export type DashboardAction =
  | { type: 'name'; value: string }
  | { type: 'search'; value: string }
  | { type: 'filter'; action: FilterEditorAction }
  | { type: 'add-widget'; widget: DashboardWidget }
  | { type: 'update-widget'; id: string; patch: Partial<Pick<DashboardWidget, 'title' | 'size' | 'plotFilter'>> }
  | { type: 'chart'; id: string; action: ChartAction }
  | { type: 'remove-widget'; id: string }
  | { type: 'move-widget'; id: string; offset: -1 | 1 }
  | { type: 'reset-filters' }

export function createDashboardDraft(dashboard: Dashboard): DashboardDraft {
  return { dashboard, filterEditor: createFilterEditorState(dashboard.filters) }
}

export function dashboardReducer(state: DashboardDraft, action: DashboardAction): DashboardDraft {
  const { dashboard } = state
  const replace = (change: Partial<Dashboard>) => ({ ...state, dashboard: { ...dashboard, ...change } })
  const updateWidget = (id: string, update: (widget: DashboardWidget) => DashboardWidget) => dashboard.widgets.some(widget => widget.id === id)
    ? replace({ widgets: dashboard.widgets.map(widget => widget.id === id ? update(widget) : widget) }) : state
  switch (action.type) {
    case 'name': return replace({ name: action.value })
    case 'search': return replace({ search: action.value })
    case 'filter': {
      const filterEditor = reduceFilterEditor(state.filterEditor, action.action)
      return { dashboard: { ...dashboard, filters: filterEditorExpressions(filterEditor) }, filterEditor }
    }
    case 'add-widget': return dashboard.widgets.some(widget => widget.id === action.widget.id)
      ? state : replace({ widgets: [...dashboard.widgets, action.widget] })
    case 'update-widget': return updateWidget(action.id, widget => ({ ...widget, ...action.patch }))
    case 'chart': return updateWidget(action.id, widget => ({ ...widget, configuration: reduceChartConfiguration(widget.configuration, action.action) }))
    case 'remove-widget': return replace({ widgets: dashboard.widgets.filter(widget => widget.id !== action.id) })
    case 'move-widget': {
      const index = dashboard.widgets.findIndex(widget => widget.id === action.id)
      const target = index + action.offset
      if (index < 0 || target < 0 || target >= dashboard.widgets.length) return state
      const widgets = [...dashboard.widgets]
      ;[widgets[index], widgets[target]] = [widgets[target]!, widgets[index]!]
      return replace({ widgets })
    }
    case 'reset-filters': return {
      dashboard: { ...dashboard, search: '', filters: [], widgets: dashboard.widgets.map(widget => ({ ...widget, plotFilter: null })) },
      filterEditor: createFilterEditorState(),
    }
  }
}

export function dashboardIsDirty(dashboard: Dashboard, saved: readonly Dashboard[]): boolean {
  return JSON.stringify(dashboard) !== JSON.stringify(saved.find(item => item.id === dashboard.id))
}
