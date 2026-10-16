import type { ExperimentQuery } from '../data/types.ts'
import { propertyRangeConditions } from '../features/charts/propertyRangeFilter.ts'
import type { Dashboard } from './types.ts'

/** Every widget narrows the dashboard; its context query omits only its own range. */
export function dashboardQuery(dashboard: Dashboard, contextWidgetId?: string): ExperimentQuery {
  return {
    search: dashboard.search,
    filters: [...dashboard.filters, ...dashboard.widgets.flatMap(widget =>
      widget.id === contextWidgetId ? [] : propertyRangeConditions(widget.plotFilter))],
  }
}
