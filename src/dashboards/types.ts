import type { ChartConfiguration } from '../features/charts/chartConfiguration.ts'
import type { PropertyRangeFilter } from '../features/charts/propertyRangeFilter.ts'

export type DashboardTemplate = 'grid' | 'stack' | 'feature'
export type DashboardLayout = DashboardTemplate | 'custom'

export interface DashboardWidget {
  readonly id: string
  readonly title: string
  readonly size: 'half' | 'full'
  readonly configuration: ChartConfiguration
  readonly plotFilter: PropertyRangeFilter | null
}

export interface Dashboard {
  readonly id: string
  readonly name: string
  readonly layout: DashboardLayout
  readonly widgets: readonly DashboardWidget[]
  readonly createdAt: string
  readonly updatedAt: string
}

export interface DashboardStore {
  readonly version: 1
  readonly dashboards: readonly Dashboard[]
}

/** Synchronous storage port; tests can inject an in-memory implementation. */
export interface DashboardStorage {
  read: () => string | null
  write: (value: string) => void
}

export interface DashboardRepository {
  list: () => readonly Dashboard[]
  save: (dashboard: Dashboard) => Dashboard
  remove: (id: string) => void
}
