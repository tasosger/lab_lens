import { DASHBOARD_TEMPLATES } from '../../dashboards/layout'
import type { DashboardLayout, DashboardTemplate } from '../../dashboards/types'

export function DashboardLayoutPicker({ layout, onChoose }: { layout: DashboardLayout; onChoose: (template: DashboardTemplate) => void }) {
  return <label className="dashboard-layout-picker">Template
    <select value={layout} title="Templates change plot positions only" onChange={event => onChoose(event.target.value as DashboardTemplate)}>
      {layout === 'custom' && <option value="custom" disabled>Custom layout</option>}
      {DASHBOARD_TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
    </select>
  </label>
}
