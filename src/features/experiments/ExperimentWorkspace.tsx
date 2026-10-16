import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { ExperimentRepository } from '../../data'
import { ExperimentDetails } from './ExperimentDetails'
import { ComparisonView } from './ComparisonView'
import { DashboardWorkspace } from '../dashboards/DashboardWorkspace'
import { useDashboardLibrary } from '../dashboards/useDashboardLibrary'
import { dashboardIsDirty } from '../dashboards/dashboardReducer'
import { useUnsavedNavigation } from '../../components/useUnsavedNavigation'
import { UnsavedDashboardDialog } from '../dashboards/UnsavedDashboardDialog'
import { Icon } from '../../components/Icon'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { ExperimentBrowser } from './ExperimentBrowser'
import { useWorkspaceData } from './useWorkspaceData'
import {
  createWorkspaceState,
  SELECTION_LIMIT,
  workspaceReducer,
  type WorkspaceView,
} from './workspaceReducer'

const viewHeadings: Record<WorkspaceView, string> = { explore: 'Experiments', compare: 'Compare experiments', charts: 'Charts', dashboards: 'Dashboards' }
const viewTargets: Record<WorkspaceView, string> = { explore: 'experiments', compare: 'comparison', charts: 'charts', dashboards: 'dashboards' }

export function ExperimentWorkspace({ repository }: { repository: ExperimentRepository }) {
  const properties = repository.getProperties()
  const [state, dispatch] = useReducer(workspaceReducer, properties, createWorkspaceState)
  const dashboardLibrary = useDashboardLibrary(properties)
  const dashboardNavigation = useUnsavedNavigation(
    state.activeView === 'dashboards' && Boolean(dashboardLibrary.active && dashboardIsDirty(dashboardLibrary.active.dashboard, dashboardLibrary.saved)),
    dashboardLibrary.save,
  )
  const [dashboardDetailHidden, setDashboardDetailHidden] = useState(false)
  const pageHeading = useRef<HTMLHeadingElement>(null)
  const previousView = useRef(state.activeView)
  const data = useWorkspaceData(repository, state)
  const { results, hiddenSelectionCount, selectionFull, selectedExperiments, matchingIdSet } = data
  const openExperiment = state.openExperimentId ? repository.getById(state.openExperimentId) : undefined
  const openDashboardExperiment = useCallback((id: string, hidden: boolean) => {
    setDashboardDetailHidden(hidden)
    dispatch({ type: 'open-experiment', id })
  }, [])

  useEffect(() => {
    if (previousView.current !== state.activeView) {
      // Creation/renaming gives focus to the sidebar input instead of the page heading.
      if (!(state.activeView === 'dashboards' && dashboardLibrary.renamingId)) pageHeading.current?.focus()
      previousView.current = state.activeView
    }
  }, [state.activeView, dashboardLibrary.renamingId])

  function navigate(view: WorkspaceView) {
    if (view === state.activeView) return
    dashboardNavigation.request(() => showView(view))
  }

  function showView(view: WorkspaceView) {
    dispatch({ type: 'view', view })
  }

  function selectDashboard(id: string) {
    if (state.activeView === 'dashboards' && dashboardLibrary.active?.dashboard.id === id) return
    dashboardNavigation.request(() => { dashboardLibrary.select(id); showView('dashboards') })
  }

  function createDashboard() {
    dashboardNavigation.request(() => { dashboardLibrary.create(); showView('dashboards') })
  }

  function renameDashboard(id: string) {
    if (state.activeView === 'dashboards' && dashboardLibrary.active?.dashboard.id === id) {
      dashboardLibrary.beginRename(id)
    } else {
      dashboardNavigation.request(() => { dashboardLibrary.select(id); dashboardLibrary.beginRename(id); showView('dashboards') })
    }
  }

  return (
    <div className="app-shell">
      <a href={`#${viewTargets[state.activeView]}`} className="skip-link">
        Skip to {viewTargets[state.activeView]}
      </a>
      <WorkspaceSidebar
        experimentCount={results.total}
        inputCount={properties.filter((property) => property.group === 'inputs').length}
        outputCount={properties.filter((property) => property.group === 'outputs').length}
        activeView={state.activeView}
        selectedCount={state.selectedIds.length}
        onNavigate={navigate}
        dashboardLibrary={dashboardLibrary}
        onSelectDashboard={selectDashboard}
        onCreateDashboard={createDashboard}
        onRenameDashboard={renameDashboard}
      />
      {dashboardNavigation.pending && <UnsavedDashboardDialog name={dashboardLibrary.active?.dashboard.name ?? ''}
        error={dashboardLibrary.error} onDecide={dashboardNavigation.decide} />}

      <main className="workspace">
        <div className="page-heading">
          <div>
            <h1 id="experiments-heading" className={state.activeView === 'dashboards' ? 'dashboard-page-title' : undefined} ref={pageHeading} tabIndex={-1}>
              {state.activeView === 'dashboards' && dashboardLibrary.active
                ? dashboardLibrary.active.dashboard.name || 'Untitled dashboard' : viewHeadings[state.activeView]}
            </h1>
            {state.activeView === 'compare' && (
              <p className="comparison-page-description">Inspect values and differences across your selected experiments.</p>
            )}
            {state.activeView === 'charts' && (
              <p className="comparison-page-description">Explore distributions and relationships between inputs and outputs.</p>
            )}
          </div>
          {state.selectedIds.length > 0 && (
            <div className="workspace-selection-actions">
              {state.activeView !== 'compare' && (
                <button className="button primary" disabled={state.selectedIds.length < 2} onClick={() => navigate('compare')}>
                  <Icon name="columns" />Compare selected ({state.selectedIds.length})
                </button>
              )}
              <button className="text-button" onClick={() => dispatch({ type: 'clear-selection' })}>Clear selection</button>
            </div>
          )}
        </div>

        {selectionFull && <p id="selection-limit" className="notice">You have selected {SELECTION_LIMIT} experiments. Remove one to add another.</p>}

        {state.activeView === 'compare' && (
          <ComparisonView
            experiments={selectedExperiments}
            properties={properties}
            baselineId={state.baselineId}
            differencesOnly={state.differencesOnly}
            hiddenCount={hiddenSelectionCount}
            onBaseline={(id) => dispatch({ type: 'baseline', id })}
            onDifferencesOnly={(value) => dispatch({ type: 'differences-only', value })}
            onRemove={(id) => {
              dispatch({ type: 'toggle-selection', id })
              pageHeading.current?.focus()
            }}
            onOpen={(id) => dispatch({ type: 'open-experiment', id })}
            onExplore={() => navigate('explore')}
          />
        )}

        <DashboardWorkspace active={state.activeView === 'dashboards'} library={dashboardLibrary} repository={repository} selectedIds={state.selectedIds}
          onOpen={openDashboardExperiment} />

        <ExperimentBrowser state={state} dispatch={dispatch} data={data} />

        <footer className="workspace-footer">
          <span>Values shown as supplied. Measurement units were not provided.</span>
        </footer>
      </main>

      {openExperiment && (
        <ExperimentDetails
          experiment={openExperiment}
          properties={properties}
          statistics={repository.getStatistics()}
          datasetCount={results.total}
          selected={state.selectedIds.includes(openExperiment.id)}
          selectionFull={selectionFull}
          hidden={state.activeView === 'dashboards' ? dashboardDetailHidden : !matchingIdSet.has(openExperiment.id)}
          onToggleSelection={() => dispatch({
            type: 'toggle-selection',
            id: openExperiment.id,
          })}
          onClose={() => dispatch({ type: 'open-experiment', id: null })}
        />
      )}
    </div>
  )
}
