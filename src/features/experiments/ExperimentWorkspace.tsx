import { useEffect, useReducer, useRef, useState } from 'react'
import {
  getPropertyValue,
  type ExperimentRepository,
  type ExperimentSort,
} from '../../data'
import { ExperimentDetails } from './ExperimentDetails'
import { ComparisonView } from './ComparisonView'
import { ScatterPlotView } from '../charts/ScatterPlotView'
import { DashboardWorkspace } from '../dashboards/DashboardWorkspace'
import { PlotRangeFilterControls } from '../charts/PlotRangeFilterControls'
import { rangeForAxes } from '../charts/propertyRangeFilter'
import { FilterGroupEditor } from './FilterGroupEditor'
import { countConditions, describeFilterExpression, toFilterExpression } from './filterTree'
import { formatValue } from './format'
import { Icon } from './Icon'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import {
  createWorkspaceState,
  getFilterTree,
  getWorkspaceQuery,
  SELECTION_LIMIT,
  workspaceReducer,
  type WorkspaceView,
} from './workspaceReducer'

const viewHeadings: Record<WorkspaceView, string> = { explore: 'Experiments', compare: 'Compare experiments', charts: 'Charts', dashboards: 'Dashboards' }
const viewTargets: Record<WorkspaceView, string> = { explore: 'experiments', compare: 'comparison', charts: 'charts', dashboards: 'dashboards' }

export function ExperimentWorkspace({ repository }: { repository: ExperimentRepository }) {
  const properties = repository.getProperties()
  const [state, dispatch] = useReducer(workspaceReducer, properties, createWorkspaceState)
  const [openControl, setOpenControl] = useState<'filters' | 'columns' | null>(null)
  const [dashboardDetailHidden, setDashboardDetailHidden] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)
  const columnButton = useRef<HTMLButtonElement>(null)
  const pageHeading = useRef<HTMLHeadingElement>(null)
  const previousView = useRef(state.activeView)
  const filterTree = getFilterTree(state)
  const filterCount = countConditions(filterTree) + (state.plotFilter ? 2 : 0)
  const query = getWorkspaceQuery(state)
  const appliedExpression = toFilterExpression(filterTree)
  const results = repository.list(query)
  // Keep source points and domains stable while changing the plot's own range.
  const chartContext = state.activeView === 'charts' && state.plotFilter
    ? repository.list(getWorkspaceQuery(state, { includePlotFilter: false })).items
    : results.items
  const visibleProperties = properties.filter((property) =>
    state.visibleColumns.includes(property.id),
  )
  const hiddenSelectionCount = state.selectedIds.filter((id) =>
    !results.items.some((experiment) => experiment.id === id),
  ).length
  const selectionFull = state.selectedIds.length >= SELECTION_LIMIT
  const openExperiment = state.openExperimentId ? repository.getById(state.openExperimentId) : undefined
  const isFiltered = Boolean(state.search.trim() || filterCount)
  const selectedExperiments = state.selectedIds.flatMap((id) => {
    const experiment = repository.getById(id)
    return experiment ? [experiment] : []
  })

  useEffect(() => {
    if (previousView.current !== state.activeView) {
      pageHeading.current?.focus()
      previousView.current = state.activeView
    }
  }, [state.activeView])

  function navigate(view: WorkspaceView) {
    setOpenControl(null)
    dispatch({ type: 'view', view })
  }

  function closeControl() {
    const trigger = openControl === 'filters' ? filterButton : columnButton
    setOpenControl(null)
    trigger.current?.focus()
  }

  function sortHeader(field: ExperimentSort['field'], label: string) {
    const active = state.sort.field === field
    return (
      <button
        className={`sort-button ${active ? 'sort-active' : ''}`}
        onClick={() => dispatch({ type: 'sort', field })}
        aria-label={`Sort by ${label} ${active && state.sort.direction === 'asc' ? 'descending' : 'ascending'}`}
      >
        <span>{label}</span>
        <Icon
          name="arrow"
          className={active && state.sort.direction === 'asc' ? 'ascending' : ''}
        />
      </button>
    )
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
      />

      <main className="workspace">
        <div className="page-heading">
          <div>
            <h1 id="experiments-heading" ref={pageHeading} tabIndex={-1}>
              {viewHeadings[state.activeView]}
            </h1>
            {state.activeView === 'compare' && (
              <p className="comparison-page-description">Inspect values and differences across your selected experiments.</p>
            )}
            {state.activeView === 'charts' && (
              <p className="comparison-page-description">Explore relationships between inputs and outputs. Choose a property for each axis.</p>
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

        <DashboardWorkspace active={state.activeView === 'dashboards'} repository={repository} selectedIds={state.selectedIds}
          onOpen={(id, hidden) => { setDashboardDetailHidden(hidden); dispatch({ type: 'open-experiment', id }) }} />

        <section
          hidden={state.activeView === 'compare' || state.activeView === 'dashboards'}
          className="experiment-card"
          aria-labelledby="experiments-heading"
        >
          <div className="toolbar">
            <div className="search-control">
              <Icon name="search" />
              <input
                aria-label="Search experiments"
                type="search"
                placeholder="Search experiments…"
                value={state.search}
                onChange={(event) => dispatch({ type: 'search', value: event.target.value })}
              />
            </div>
            <button
              ref={filterButton}
              className={`button ${openControl === 'filters' ? 'active' : ''}`}
              aria-expanded={openControl === 'filters'}
              aria-controls="filter-panel"
              onClick={() => setOpenControl(openControl === 'filters' ? null : 'filters')}
            >
              <Icon name="filter" />
              Filters
              {filterCount > 0 && (
                <span className="button-count">{filterCount}</span>
              )}
            </button>
            {state.activeView === 'explore' && (
              <button
                ref={columnButton}
                className={`button columns-button ${openControl === 'columns' ? 'active' : ''}`}
                aria-expanded={openControl === 'columns'}
                aria-controls="column-chooser"
                onClick={() => setOpenControl(openControl === 'columns' ? null : 'columns')}
              >
                <Icon name="columns" />
                Columns
                <span className="button-count">{visibleProperties.length}</span>
              </button>
            )}
          </div>

          {openControl && (
            <div
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  closeControl()
                }
              }}
            >
              {openControl === 'filters' && (
                <section id="filter-panel" className="filter-panel" aria-label="Experiment filters">
                  <div className="editor-heading">
                    <div>
                      <strong>Filter experiments</strong>
                      <p>Use groups to combine AND and OR, such as (A OR B) AND C.</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Close filters"
                      onClick={closeControl}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                  <FilterGroupEditor group={filterTree} properties={properties} dispatch={dispatch} />
                  {filterCount > 0 && (
                    <button
                      className="text-button clear-filters"
                      onClick={() => dispatch({ type: 'clear-filters' })}
                    >
                      Clear filters
                    </button>
                  )}
                </section>
              )}
              {openControl === 'columns' && (
                <div id="column-chooser" className="column-chooser">
                  <div className="editor-heading">
                    <div>
                      <strong>Visible columns</strong>
                      <p>Experiment names always stay visible.</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Close column chooser"
                      onClick={closeControl}
                    >
                      <Icon name="close" />
                    </button>
                  </div>

                  {(['outputs', 'inputs'] as const).map((group) => (
                    <fieldset key={group}>
                      <legend>{group === 'outputs' ? 'Outputs' : 'Inputs'}</legend>
                      <div className="column-options">
                        {properties
                          .filter((property) => property.group === group)
                          .map((property) => (
                            <label key={property.id}>
                              <input
                                type="checkbox"
                                checked={state.visibleColumns.includes(property.id)}
                                onChange={() => dispatch({
                                  type: 'toggle-column',
                                  propertyId: property.id,
                                })}
                              />
                              {property.name}
                            </label>
                          ))}
                      </div>
                    </fieldset>
                  ))}

                  <button
                    className="text-button"
                    onClick={() => dispatch({
                      type: 'reset-columns',
                      propertyIds: properties
                        .filter((property) => property.group === 'outputs')
                        .map((property) => property.id),
                    })}
                  >
                    Restore default columns
                  </button>
                </div>
              )}
            </div>
          )}

          {appliedExpression && openControl !== 'filters' && (
            <div className="applied-filters">
              <p className="filter-expression" aria-label="Applied filter expression">
                {describeFilterExpression(appliedExpression, properties)}
              </p>
              <button
                className="text-button"
                aria-expanded={false}
                aria-controls="filter-panel"
                onClick={() => setOpenControl('filters')}
              >
                Edit filters
              </button>
              <button
                className="text-button clear-filters"
                onClick={() => dispatch({ type: 'clear-filters' })}
              >
                Clear filters
              </button>
            </div>
          )}

          {state.plotFilter && (
            <PlotRangeFilterControls filter={state.plotFilter} properties={properties}
              onChange={(filter) => dispatch({ type: 'set-plot-filter', filter })} />
          )}

          <div className="results-heading">
            <p role="status" aria-live="polite">
              <strong>{results.matched}</strong> of {results.total} experiments
              {isFiltered && <span className="filtered-label">Filtered</span>}
            </p>
            <span className="results-hint">
              {hiddenSelectionCount > 0
                ? `${hiddenSelectionCount} selected outside current results`
                : state.activeView === 'charts' ? 'Each point is one experiment' : 'Select experiments to compare'}
            </span>
          </div>

          {state.activeView === 'charts' && (
            <ScatterPlotView
              experiments={chartContext}
              matchingIds={results.items.map((experiment) => experiment.id)}
              rangeSelection={rangeForAxes(state.plotFilter, state.chartAxes)}
              hasPlotFilter={Boolean(state.plotFilter)}
              onPlotFilter={(filter) => dispatch({ type: 'set-plot-filter', filter })}
              properties={properties}
              axes={state.chartAxes}
              mode={state.chartMode}
              zPropertyId={state.chartZ}
              camera={state.chartCamera}
              onModeChange={(mode) => dispatch({ type: 'chart-mode', mode })}
              onZChange={(propertyId) => dispatch({ type: 'chart-z', propertyId })}
              onCameraChange={(camera) => dispatch({ type: 'chart-camera', camera })}
              selectedIds={state.selectedIds}
              isFiltered={isFiltered}
              onAxisChange={(axis, propertyId) => dispatch({ type: 'chart-axis', axis, propertyId })}
              onSwapAxes={(pair) => dispatch({ type: 'swap-chart-axes', pair })}
              onOpen={(id) => dispatch({ type: 'open-experiment', id })}
              onResetQuery={() => dispatch({ type: 'reset-query' })}
            />
          )}

          <div hidden={state.activeView !== 'explore'}>
            <div
              className="table-scroll"
              id="experiments"
              role="region"
              aria-label="Experiment results, scroll for more rows or columns"
              tabIndex={0}
            >
              <table className="experiment-table">
                <caption className="sr-only">
                  Experiments and their measured properties. Use experiment names to open details.
                </caption>
                <thead>
                  <tr>
                    <th className="selection-cell">
                      <span className="sr-only">Selection</span>
                    </th>
                    <th
                      className="identity-cell"
                      scope="col"
                      aria-sort={state.sort.field === 'id'
                        ? (state.sort.direction === 'asc' ? 'ascending' : 'descending')
                        : 'none'}
                    >
                      {sortHeader('id', 'Experiment name')}
                    </th>
                    {visibleProperties.map((property) => (
                      <th
                        key={property.id}
                        className="numeric-cell"
                        scope="col"
                        aria-sort={state.sort.field === property.id
                          ? (state.sort.direction === 'asc' ? 'ascending' : 'descending')
                          : 'none'}
                      >
                        <span className="column-group">
                          {property.group === 'outputs' ? 'Output' : 'Input'}
                        </span>
                        {sortHeader(property.id, property.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.items.map((experiment) => {
                    const selected = state.selectedIds.includes(experiment.id)
                    return (
                      <tr key={experiment.id} className={selected ? 'selected-row' : ''}>
                        <td className="selection-cell">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={selectionFull && !selected}
                            aria-label={`Select ${experiment.id}`}
                            aria-describedby={selectionFull && !selected
                              ? 'selection-limit'
                              : undefined}
                            onChange={() => dispatch({
                              type: 'toggle-selection',
                              id: experiment.id,
                            })}
                          />
                        </td>
                        <th className="identity-cell" scope="row">
                          <button
                            className="experiment-link"
                            onClick={() => dispatch({
                              type: 'open-experiment',
                              id: experiment.id,
                            })}
                          >
                            {experiment.id}
                            <Icon name="chevron" />
                          </button>
                        </th>
                        {visibleProperties.map((property) => (
                          <td key={property.id} className="numeric-cell">
                            {formatValue(getPropertyValue(experiment, property))}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {results.matched === 0 && (
                <div className="empty-state">
                  <span className="empty-icon"><Icon name="search" /></span>
                  <h3>
                    {results.total === 0 ? 'No experiments available' : 'No matching experiments'}
                  </h3>
                  <p>
                    {results.total === 0
                      ? 'The dataset does not contain any experiments yet.'
                      : 'Try a different name or adjust your filter conditions.'}
                  </p>
                  {isFiltered && (
                    <button
                      className="button"
                      onClick={() => dispatch({ type: 'reset-query' })}
                    >
                      Reset search and filters
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="table-footer">
              <span>Open an experiment for details. Click a heading to sort.</span>
              <span>— indicates a missing value</span>
            </div>
          </div>
        </section>

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
          hidden={state.activeView === 'dashboards' ? dashboardDetailHidden : !results.items.some((experiment) => experiment.id === openExperiment.id)}
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
