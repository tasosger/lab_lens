import type { ExperimentRepository } from '../../data'
import { DashboardEditor } from './DashboardEditor'
import { DashboardList } from './DashboardList'
import { dashboardIsDirty } from './dashboardReducer'
import { useDashboardLibrary } from './useDashboardLibrary'
import './dashboards.css'

export function DashboardWorkspace({ active, repository, selectedIds, onOpen }: {
  active: boolean
  repository: ExperimentRepository
  selectedIds: readonly string[]
  onOpen: (id: string, hidden: boolean) => void
}) {
  // Stay mounted across workspace navigation so unsaved drafts are retained.
  const library = useDashboardLibrary(repository.getProperties())
  if (!active) return null
  return (
    <section id="dashboards" aria-label="Dashboards" className="dashboard-workspace">
      {library.error && <div className="dashboard-error" role="alert"><p>{library.error}</p>
        {!library.ready && <button className="button" onClick={library.retry}>Retry loading</button>}
      </div>}
      {!library.ready ? <p role="status">{library.error ? 'Your saved data has not been replaced.' : 'Loading dashboards…'}</p> : <>
        <DashboardList drafts={library.drafts} saved={library.saved} activeId={library.active?.dashboard.id} onSelect={library.select} onCreate={library.create} />
        {library.active ? <DashboardEditor key={library.active.dashboard.id} draft={library.active}
          dirty={dashboardIsDirty(library.active.dashboard, library.saved)} repository={repository} selectedIds={selectedIds}
          onAction={library.edit} onSave={library.save} onDuplicate={library.duplicate}
          onDelete={() => library.remove(library.active!.dashboard.id)} onOpen={onOpen} />
          : <div className="dashboard-empty"><h2>No dashboards yet</h2><p>Create a dashboard and save a collection of plots.</p><button className="button primary" onClick={library.create}>New dashboard</button></div>}
      </>}
    </section>
  )
}
