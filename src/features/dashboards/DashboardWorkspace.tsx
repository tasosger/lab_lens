import type { ExperimentRepository } from '../../data'
import { DashboardEditor } from './DashboardEditor'
import { dashboardIsDirty } from './dashboardReducer'
import type { DashboardLibrary } from './useDashboardLibrary'
import './dashboards.css'

export function DashboardWorkspace({ active, library, repository, selectedIds, onOpen }: {
  active: boolean
  library: DashboardLibrary
  repository: ExperimentRepository
  selectedIds: readonly string[]
  onOpen: (id: string, hidden: boolean) => void
}) {
  if (!active) return null
  return (
    <section id="dashboards" aria-label="Dashboards" className="dashboard-workspace">
      {library.error && <div className="dashboard-error" role="alert"><p>{library.error}</p>
        {!library.ready && <button className="button" onClick={library.retry}>Retry loading</button>}
      </div>}
      {!library.ready ? <p role="status">{library.error ? 'Your saved data has not been replaced.' : 'Loading dashboards…'}</p> : <>
        {library.active ? <DashboardEditor key={library.active.dashboard.id} draft={library.active}
          dirty={dashboardIsDirty(library.active.dashboard, library.saved)} repository={repository} selectedIds={selectedIds}
          onAction={library.edit} onSave={library.save} onOpen={onOpen} />
          : <div className="dashboard-empty"><h2>No dashboards yet</h2><p>Use the add button under Dashboards in the sidebar to create one.</p></div>}
      </>}
    </section>
  )
}
