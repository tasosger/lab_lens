import { useCallback } from 'react'
import { chartDefinitions } from '../../chart-model/registry'
import { ExperimentChartView } from '../charts/ExperimentChartView'
import { ExperimentToolbar } from './ExperimentToolbar'
import { ExperimentTable } from './ExperimentTable'
import type { WorkspaceAction, WorkspaceState } from './workspaceReducer'
import type { WorkspaceData } from './useWorkspaceData'

export function ExperimentBrowser({ state, dispatch, data }: {
  state: WorkspaceState
  dispatch: (action: WorkspaceAction) => void
  data: WorkspaceData
}) {
  const { results, properties, allExperiments, filterTree, filterCount, visibleProperties, hiddenSelectionCount, selectionFull, isFiltered, matchingIds } = data
  const onOpen = useCallback((id: string) => dispatch({ type: 'open-experiment', id }), [dispatch])
  const onResetQuery = useCallback(() => dispatch({ type: 'reset-query' }), [dispatch])
  return (
    <section
      hidden={state.activeView === 'compare' || state.activeView === 'dashboards'}
      className="experiment-card"
      aria-labelledby="experiments-heading"
    >
      <ExperimentToolbar key={state.activeView} state={state} dispatch={dispatch} results={results} properties={properties}
        allExperiments={allExperiments} filterTree={filterTree} filterCount={filterCount} visibleProperties={visibleProperties} />

      <div className="results-heading">
        <p role="status" aria-live="polite">
          <strong>{results.matched}</strong> of {results.total} experiments
          {isFiltered && <span className="filtered-label">Filtered</span>}
        </p>
        <span className="results-hint">
          {hiddenSelectionCount > 0
            ? `${hiddenSelectionCount} selected outside current results`
            : state.activeView === 'charts' ? chartDefinitions[state.chart.chartType].hint : 'Select experiments to compare'}
        </span>
      </div>

      {state.activeView === 'charts' && (
        <ExperimentChartView
          experiments={results.items}
          matchingIds={matchingIds}
          properties={properties}
          configuration={state.chart}
          onChartAction={dispatch}
          selectedIds={state.selectedIds}
          isFiltered={isFiltered}
          onOpen={onOpen}
          onResetQuery={onResetQuery}
        />
      )}

      <div hidden={state.activeView !== 'explore'}>
        <ExperimentTable results={results} visibleProperties={visibleProperties} sort={state.sort} selectedIds={state.selectedIds}
          selectionFull={selectionFull} isFiltered={isFiltered} onSort={field => dispatch({ type: 'sort', field })}
          onSelect={id => dispatch({ type: 'toggle-selection', id })} onOpen={onOpen} onResetQuery={onResetQuery} />
      </div>
    </section>

  )
}
