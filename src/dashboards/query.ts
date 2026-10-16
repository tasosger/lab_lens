import type { ExperimentQuery } from '../data/types.ts'
import { propertyRangeConditions } from '../features/charts/propertyRangeFilter.ts'
import type { DashboardWidget } from './types.ts'

/** Each plot filters its own results; sibling plots never enter this query. */
export function dashboardWidgetQuery(widget: DashboardWidget): ExperimentQuery {
  return { filters: propertyRangeConditions(widget.plotFilter) }
}
