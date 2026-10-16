import { useEffect, useRef, useState } from 'react'
import type { ExperimentRepository } from '../../data'
import type { Dashboard } from '../../dashboards/types'
import { templateSize } from '../../dashboards/layout'
import { useSortableGrid } from '../../components/useSortableGrid'
import { DashboardWidget } from './DashboardWidget'
import type { DashboardAction } from './dashboardReducer'

export function DashboardCanvas({ dashboard, repository, selectedIds, onAction, onAddPlot, onOpen }: {
  dashboard: Dashboard
  repository: ExperimentRepository
  selectedIds: readonly string[]
  onAction: (action: DashboardAction) => void
  onAddPlot: () => void
  onOpen: (id: string, hidden: boolean) => void
}) {
  const sortable = useSortableGrid(dashboard.widgets, (id, targetId) => onAction({ type: 'reorder-widget', id, targetId }))
  const [initialWidgetIds] = useState(() => new Set(dashboard.widgets.map(widget => widget.id)))
  const previousIds = useRef(dashboard.widgets.map(widget => widget.id))
  useEffect(() => {
    const added = dashboard.widgets.find(widget => !previousIds.current.includes(widget.id))
    if (added) {
      const article = Array.from(sortable.container.current?.querySelectorAll<HTMLElement>('[data-sortable-id]') ?? []).find(element => element.dataset.sortableId === added.id)
      article?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      const title = article?.querySelector<HTMLInputElement>('.dashboard-widget-title input')
      title?.focus({ preventScroll: true })
      title?.select()
    }
    previousIds.current = dashboard.widgets.map(widget => widget.id)
  }, [dashboard.widgets, sortable.container])
  const from = dashboard.widgets.findIndex(widget => widget.id === sortable.drag?.id)
  const to = dashboard.widgets.findIndex(widget => widget.id === sortable.drag?.targetId)
  return <>
    <p className="dashboard-canvas-help" id={sortable.instructionsId}>Drag a plot by its handle to rearrange it.<span className="sr-only"> Keyboard: focus the handle and use arrow keys or Home/End.</span></p>
    <p className="sr-only" role="status" aria-live="polite">{sortable.announcement}</p>
    <div className={`dashboard-grid${sortable.drag ? ' dashboard-grid-dragging' : ''}`} ref={sortable.container}>
      {dashboard.widgets.map(widget => <DashboardWidget key={widget.id} widget={widget} repository={repository}
        initiallyEditing={!initialWidgetIds.has(widget.id)}
        selectedIds={selectedIds} onAction={onAction} onOpen={onOpen}
        dragHandleProps={sortable.handleProps(widget.id)} dragging={sortable.drag?.id === widget.id}
        dropPosition={sortable.drag?.targetId === widget.id && from !== to ? (from < to ? 'after' : 'before') : undefined} />)}
      <button className={`dashboard-add-tile dashboard-widget-${templateSize(dashboard.layout, dashboard.widgets.length)}`} disabled={!repository.getProperties().length} onClick={onAddPlot}>
        <span aria-hidden="true">+</span><strong>{dashboard.widgets.length ? 'Add another plot' : 'Create your first plot'}</strong>
        <small>Choose axes and see your data live</small>
      </button>
    </div>
    {sortable.drag && <div className="dashboard-drag-preview" aria-hidden="true" style={{ left: sortable.drag.x + 14, top: sortable.drag.y + 14 }}>
      {dashboard.widgets.find(widget => widget.id === sortable.drag?.id)?.title || 'Plot'}
      <small>{to >= 0 && to !== from ? `Release to move to position ${to + 1}` : 'Drag over another plot · Esc to cancel'}</small>
    </div>}
  </>
}
