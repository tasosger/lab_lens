import { useRef, useState } from 'react'
import type { Experiment, ExperimentList, PropertyDefinition } from '../../data'
import { FilterGroupEditor } from './FilterGroupEditor'
import { FilterSummary } from './FilterSummary'
import { ColumnChooser } from './ColumnChooser'
import type { AppliedFilterGroup } from './filterTree'
import type { WorkspaceAction, WorkspaceState } from './workspaceReducer'
import { Icon } from '../../components/Icon'

/** Owns transient editor state and focus; query state remains in the workspace. */
export function ExperimentToolbar({ state, dispatch, results, properties, allExperiments, filterTree, filterCount, visibleProperties }: {
  state: Pick<WorkspaceState, 'activeView' | 'search' | 'visibleColumns'>
  dispatch: (action: WorkspaceAction) => void
  results: ExperimentList
  properties: readonly PropertyDefinition[]
  allExperiments: readonly Experiment[]
  filterTree: AppliedFilterGroup
  filterCount: number
  visibleProperties: readonly PropertyDefinition[]
}) {
  const [openControl, setOpenControl] = useState<'filters' | 'columns' | null>(null)
  const [filterToEdit, setFilterToEdit] = useState<number | undefined>()
  const filterButton = useRef<HTMLButtonElement>(null)
  const columnButton = useRef<HTMLButtonElement>(null)
  function closeControl() {
    const trigger = openControl === 'filters' ? filterButton : columnButton
    setOpenControl(null)
    trigger.current?.focus()
  }

  return <>
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
        className={`icon-button toolbar-action${filterCount > 0 ? ' has-value' : ''}`}
        aria-label={filterCount ? `Filters (${filterCount} active)` : 'Filters'}
        title={filterCount ? `Filters (${filterCount} active)` : 'Filters'}
        aria-expanded={openControl === 'filters'}
        aria-controls="filter-panel"
        onClick={() => { setFilterToEdit(undefined); setOpenControl(openControl === 'filters' ? null : 'filters') }}
      >
        <Icon name="filter" />
        {filterCount > 0 && (
          <span className="button-count" aria-hidden="true">{filterCount}</span>
        )}
      </button>
      {state.activeView === 'explore' && (
        <button
          ref={columnButton}
          className="icon-button toolbar-action columns-button"
          aria-label={`Columns (${visibleProperties.length} visible)`}
          title={`Columns (${visibleProperties.length} visible)`}
          aria-expanded={openControl === 'columns'}
          aria-controls="column-chooser"
          onClick={() => setOpenControl(openControl === 'columns' ? null : 'columns')}
        >
          <Icon name="columns" />
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
                <p className="filter-panel-results">{results.matched} of {results.total} experiments match your filters</p>
              </div>
              <div className="filter-panel-actions">
                {filterCount > 0 && <button type="button" className="text-button clear-filters"
                  onClick={() => dispatch({ type: 'clear-filters' })}>Clear all</button>}
                <button
                  className="icon-button"
                  aria-label="Close filters"
                  title="Close filters"
                  onClick={closeControl}
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>
            <FilterGroupEditor group={filterTree} properties={properties} experiments={allExperiments} dispatch={dispatch} initialFilterId={filterToEdit} search={state.search} />
          </section>
        )}
        {openControl === 'columns' && (
          <ColumnChooser properties={properties} visibleColumns={state.visibleColumns} onClose={closeControl}
            onToggle={propertyId => dispatch({ type: 'toggle-column', propertyId })}
            onReset={() => dispatch({ type: 'reset-columns', propertyIds: properties.filter(property => property.group === 'outputs').map(property => property.id) })} />
        )}
      </div>
    )}

    {filterCount > 0 && openControl !== 'filters' && (
      <div className="applied-filters">
        <FilterSummary group={filterTree} properties={properties} onEdit={id => { setFilterToEdit(id); setOpenControl('filters') }} />
        <button
          className="icon-button"
          aria-label="Edit filters"
          title="Edit filters"
          aria-expanded={false}
          aria-controls="filter-panel"
          onClick={() => { setFilterToEdit(undefined); setOpenControl('filters') }}
        >
          <Icon name="edit" />
        </button>
        <button
          className="icon-button"
          aria-label="Clear filters"
          title="Clear filters"
          onClick={() => dispatch({ type: 'clear-filters' })}
        >
          <Icon name="close" />
        </button>
      </div>
    )}

  </>
}
