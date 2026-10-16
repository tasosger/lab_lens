import { Icon } from '../../components/Icon'
import type { WorkspaceView } from './workspaceReducer'
import { useId, useState } from 'react'
import { DashboardList } from '../dashboards/DashboardList'
import type { DashboardLibrary } from '../dashboards/useDashboardLibrary'

interface WorkspaceSidebarProps {
  experimentCount: number
  inputCount: number
  outputCount: number
  activeView: WorkspaceView
  selectedCount: number
  onNavigate: (view: WorkspaceView) => void
  dashboardLibrary: DashboardLibrary
  onSelectDashboard: (id: string) => void
  onCreateDashboard: () => void
  onRenameDashboard: (id: string) => void
}

export function WorkspaceSidebar({
  experimentCount,
  inputCount,
  outputCount,
  activeView,
  selectedCount,
  onNavigate,
  dashboardLibrary,
  onSelectDashboard,
  onCreateDashboard,
  onRenameDashboard,
}: WorkspaceSidebarProps) {
  const [dashboardsExpanded, setDashboardsExpanded] = useState(true)
  const dashboardsId = useId()
  return (
    <aside className="app-sidebar" aria-label="Workspace">
      <div className="brand" aria-label="LabLens">
        <span className="brand-mark"><Icon name="flask" /></span>
        <span className="sidebar-brand-name">LabLens</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <p className="sidebar-section-label">Workspace</p>
        <button
          className="sidebar-link"
          onClick={() => onNavigate('explore')}
          aria-current={activeView === 'explore' ? 'page' : undefined}
          aria-label="Experiments"
          title="Experiments"
        >
          <Icon name="table" />
          <span className="sidebar-link-label">Experiments</span>
        </button>
        <button
          className="sidebar-link"
          onClick={() => onNavigate('compare')}
          aria-current={activeView === 'compare' ? 'page' : undefined}
          aria-label={`Compare experiments, ${selectedCount} selected`}
          title="Compare experiments"
        >
          <Icon name="columns" />
          <span className="sidebar-link-label">Compare ({selectedCount})</span>
        </button>
        <button
          className="sidebar-link"
          onClick={() => onNavigate('charts')}
          aria-current={activeView === 'charts' ? 'page' : undefined}
          aria-label="Charts"
          title="Charts"
        >
          <Icon name="chart" />
          <span className="sidebar-link-label">Charts</span>
        </button>
        <div className="sidebar-dashboards">
          <div className="sidebar-dashboard-heading">
            <button className="sidebar-link" onClick={() => onNavigate('dashboards')}
              aria-current={activeView === 'dashboards' ? 'page' : undefined} aria-label="Dashboards" title="Dashboards">
              <Icon name="dashboard" /><span className="sidebar-link-label">Dashboards</span>
            </button>
            <button className="sidebar-dashboard-toggle" aria-label={dashboardsExpanded ? 'Collapse dashboards' : 'Expand dashboards'}
              title={dashboardsExpanded ? 'Collapse dashboards' : 'Expand dashboards'} aria-expanded={dashboardsExpanded}
              aria-controls={dashboardsId} onClick={() => setDashboardsExpanded(!dashboardsExpanded)}>
              <Icon name="chevron" />
            </button>
          </div>
          <div id={dashboardsId} hidden={!dashboardsExpanded}>
            {dashboardLibrary.ready ? <DashboardList drafts={dashboardLibrary.drafts} saved={dashboardLibrary.saved}
              activeId={activeView === 'dashboards' ? dashboardLibrary.active?.dashboard.id : undefined}
              renamingId={dashboardLibrary.renamingId} onRename={onRenameDashboard} onNameChange={dashboardLibrary.rename} onFinishRename={dashboardLibrary.finishRename}
              error={dashboardLibrary.error} onSelect={onSelectDashboard} onCreate={onCreateDashboard} onDelete={dashboardLibrary.remove} />
              : <p className="dashboard-storage-note">{dashboardLibrary.error ? 'Dashboards unavailable' : 'Loading dashboards…'}</p>}
          </div>
        </div>
      </nav>

      <section className="sidebar-dataset" aria-labelledby="sidebar-dataset-title">
        <h2 id="sidebar-dataset-title">Reference dataset</h2>
        <dl>
          <div><dt>Experiments</dt><dd>{experimentCount}</dd></div>
          <div><dt>Inputs</dt><dd>{inputCount}</dd></div>
          <div><dt>Outputs</dt><dd>{outputCount}</dd></div>
        </dl>
      </section>
    </aside>
  )
}
