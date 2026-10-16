import { useState } from 'react'
import type { ExperimentRepository } from '../../data'
import { createDashboardWidget } from '../../dashboards/defaults'
import { dashboardQuery } from '../../dashboards/query'
import { FilterGroupEditor } from '../experiments/FilterGroupEditor'
import { getFilterEditorTree } from '../experiments/filterEditorState'
import { countConditions, describeFilterExpression } from '../experiments/filterTree'
import { DashboardWidget } from './DashboardWidget'
import type { DashboardAction, DashboardDraft } from './dashboardReducer'

export function DashboardEditor({ draft, dirty, repository, selectedIds, onAction, onSave, onDuplicate, onDelete, onOpen }: {
  draft: DashboardDraft
  dirty: boolean
  repository: ExperimentRepository
  selectedIds: readonly string[]
  onAction: (action: DashboardAction) => void
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onOpen: (id: string, hidden: boolean) => void
}) {
  const [showFilters, setShowFilters] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { dashboard } = draft
  const properties = repository.getProperties()
  const results = repository.list(dashboardQuery(dashboard))
  const matchingIds = results.items.map(experiment => experiment.id)
  const filterTree = getFilterEditorTree(draft.filterEditor)
  const filterCount = countConditions(filterTree) + dashboard.widgets.filter(widget => widget.plotFilter).length * 2
  const addPlot = () => onAction({ type: 'add-widget', widget: createDashboardWidget(crypto.randomUUID(), properties) })

  return (
    <div className="dashboard-editor">
      <div className="dashboard-editor-heading">
        <label className="dashboard-name">Dashboard name
          <input value={dashboard.name} placeholder="Name your dashboard" onChange={event => onAction({ type: 'name', value: event.target.value })} />
        </label>
        <div className="dashboard-save-actions">
          <span role="status" aria-live="polite" className={dirty ? 'dashboard-dirty' : 'dashboard-saved'}>{dirty ? 'Unsaved changes' : 'Saved in this browser'}</span>
          <button className="button primary" onClick={onSave} disabled={!dirty}>Save dashboard</button>
          <button className="button" onClick={onDuplicate}>Duplicate dashboard</button>
          <button className="text-button" onClick={() => setConfirmDelete(!confirmDelete)}>Delete dashboard</button>
        </div>
      </div>
      {confirmDelete && <div className="dashboard-confirm" role="group" aria-label="Delete dashboard confirmation">
        <p>Delete “{dashboard.name || 'Untitled dashboard'}” and its plots?</p>
        <button className="button" onClick={onDelete}>Delete this dashboard</button>
        <button className="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
      </div>}
      <div className="dashboard-toolbar">
        <label className="dashboard-search"><span className="sr-only">Search dashboard experiments</span>
          <input type="search" value={dashboard.search} placeholder="Search experiments…" onChange={event => onAction({ type: 'search', value: event.target.value })} />
        </label>
        <button className={`button${showFilters ? ' active' : ''}`} aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>Filters{filterCount ? ` (${filterCount})` : ''}</button>
        <button className="button" disabled={!properties.length} onClick={addPlot}>Add plot</button>
        {(filterCount > 0 || dashboard.search) && <button className="text-button" onClick={() => onAction({ type: 'reset-filters' })}>Clear all filters</button>}
        <span className="dashboard-result-count" role="status" aria-live="polite">{results.matched} of {results.total} experiments</span>
      </div>
      {showFilters && <div className="dashboard-filter-panel">
        <p>These conditions apply to every plot. Each plot’s range further narrows the results.</p>
        <FilterGroupEditor group={filterTree} properties={properties} dispatch={action => onAction({ type: 'filter', action })} />
      </div>}
      {!showFilters && dashboard.filters.length > 0 && <p className="dashboard-filter-description">{dashboard.filters.map(filter => describeFilterExpression(filter, properties)).join(' AND ')}</p>}
      {dashboard.widgets.length === 0 ? <div className="dashboard-empty">
        <h2>Add your first plot</h2><p>Choose properties and arrange charts to build your dashboard.</p>
        <button className="button primary" disabled={!properties.length} onClick={addPlot}>Add plot</button>
      </div> : <div className="dashboard-grid">
        {dashboard.widgets.map((widget, index) => <DashboardWidget key={widget.id} widget={widget} dashboard={dashboard} repository={repository}
          matchingIds={matchingIds} selectedIds={selectedIds} index={index} onAction={onAction} onOpen={id => onOpen(id, !matchingIds.includes(id))} />)}
      </div>}
    </div>
  )
}
