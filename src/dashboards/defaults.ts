import type { PropertyDefinition, PropertyId } from '../data/types.ts'
import { createChartConfiguration } from '../features/charts/chartConfiguration.ts'
import type { Dashboard, DashboardWidget } from './types.ts'

export function createDashboard(id: string, name: string, now: string): Dashboard {
  return { id, name, layout: 'grid', widgets: [], createdAt: now, updatedAt: now }
}

export function createDashboardWidget(id: string, properties: readonly PropertyDefinition[]): DashboardWidget {
  return { id, title: 'New plot', size: 'half', configuration: createChartConfiguration(properties), plotFilter: null }
}

export function createDefaultDashboard(properties: readonly PropertyDefinition[], now: string): Dashboard {
  const first = createDashboardWidget('overview-process', properties)
  const second = createDashboardWidget('overview-properties', properties)
  const choose = (preferred: PropertyId, fallback: PropertyId | null) => properties.some(p => p.id === preferred) ? preferred : fallback
  return {
    ...createDashboard('experiment-overview', 'Experiment overview', now),
    widgets: [
      { ...first, title: 'Process and performance' },
      { ...second, title: 'Material properties', configuration: {
        ...second.configuration,
        chartAxes: {
          x: choose('outputs:Viscosity', second.configuration.chartAxes.x),
          y: choose('outputs:Tensile Strength', second.configuration.chartAxes.y),
        },
      } },
    ],
  }
}
