import type { PropertyDefinition } from '../data/types.ts'
import { createDefaultDashboard } from './defaults.ts'
import { decodeDashboardStore, validateDashboard } from './validation.ts'
import type { Dashboard, DashboardRepository, DashboardStorage } from './types.ts'

export function createDashboardRepository(storage: DashboardStorage, properties: readonly PropertyDefinition[], clock = () => new Date().toISOString()): DashboardRepository {
  function write(dashboards: readonly Dashboard[]) {
    storage.write(JSON.stringify({ version: 1, dashboards }))
  }
  function list(): readonly Dashboard[] {
    const raw = storage.read()
    if (raw !== null) return decodeDashboardStore(raw, properties).dashboards
    const dashboards = [createDefaultDashboard(properties, clock())]
    write(dashboards)
    return dashboards
  }
  return {
    list,
    save(dashboard) {
      // Read before every mutation to retain other dashboards saved by another tab.
      const dashboards = list()
      const existing = dashboards.find(item => item.id === dashboard.id)
      const saved = validateDashboard({ ...dashboard, createdAt: existing?.createdAt ?? dashboard.createdAt, updatedAt: clock() }, properties)
      write(existing ? dashboards.map(item => item.id === saved.id ? saved : item) : [...dashboards, saved])
      return saved
    },
    remove(id) { write(list().filter(dashboard => dashboard.id !== id)) },
  }
}
