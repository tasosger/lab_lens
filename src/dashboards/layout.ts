import type { Dashboard, DashboardLayout, DashboardTemplate, DashboardWidget } from './types.ts'

export const DASHBOARD_TEMPLATES: readonly { id: DashboardTemplate; name: string }[] = [
  { id: 'grid', name: 'Two columns' },
  { id: 'stack', name: 'Stacked' },
  { id: 'feature', name: 'Featured plot' },
]

export function isDashboardLayout(value: unknown): value is DashboardLayout {
  return value === 'custom' || DASHBOARD_TEMPLATES.some(template => template.id === value)
}

export function templateSize(layout: DashboardLayout, index: number, fallback: DashboardWidget['size'] = 'half'): DashboardWidget['size'] {
  if (layout === 'custom') return fallback
  return layout === 'stack' || (layout === 'feature' && index === 0) ? 'full' : 'half'
}

/** Templates change placement only; all chart content, identities and filters survive. */
export function applyDashboardTemplate(dashboard: Dashboard, layout: DashboardTemplate): Dashboard {
  return { ...dashboard, layout, widgets: dashboard.widgets.map(({ columns: _columns, ...widget }, index) => ({ ...widget, size: templateSize(layout, index) })) }
}
