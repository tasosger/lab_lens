import type { DashboardStorage } from './types.ts'

export const DASHBOARD_STORAGE_KEY = 'lablens.dashboards.v1'

/** Resolve browser storage lazily, because access itself may be denied. */
export function createLocalDashboardStorage(): DashboardStorage {
  return {
    read: () => window.localStorage.getItem(DASHBOARD_STORAGE_KEY),
    write: (value) => window.localStorage.setItem(DASHBOARD_STORAGE_KEY, value),
  }
}
