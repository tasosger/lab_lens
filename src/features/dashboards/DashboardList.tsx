import { useState } from 'react'
import type { Dashboard } from '../../dashboards/types'
import { dashboardIsDirty, type DashboardDraft } from './dashboardReducer'

export function DashboardList({ drafts, saved, activeId, onSelect, onCreate }: {
  drafts: readonly DashboardDraft[]
  saved: readonly Dashboard[]
  activeId: string | undefined
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  const [sort, setSort] = useState<'updated' | 'name'>('updated')
  const dashboards = drafts.map(draft => draft.dashboard).sort((a, b) => sort === 'name'
    ? a.name.localeCompare(b.name) : Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.name.localeCompare(b.name))
  return (
    <aside className="dashboard-library" aria-label="Dashboard library">
      <div className="dashboard-library-heading"><h2>My dashboards</h2><button className="button" onClick={onCreate}>New dashboard</button></div>
      <label className="dashboard-sort">Sort by
        <select value={sort} onChange={event => setSort(event.target.value as 'updated' | 'name')}>
          <option value="updated">Last saved</option><option value="name">Name</option>
        </select>
      </label>
      <div className="dashboard-list">
        {dashboards.map(dashboard => (
          <button key={dashboard.id} className="dashboard-list-item" aria-current={dashboard.id === activeId ? 'true' : undefined} onClick={() => onSelect(dashboard.id)}>
            <strong>{dashboard.name.trim() || 'Untitled dashboard'}</strong>
            <span>{dashboard.widgets.length} plots · {dashboardIsDirty(dashboard, saved) ? 'Unsaved changes' : 'Saved'}</span>
          </button>
        ))}
      </div>
      <p className="dashboard-storage-note">Saved in this browser. Each dashboard keeps its own plots and filters.</p>
    </aside>
  )
}
