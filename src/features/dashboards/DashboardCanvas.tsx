import { useEffect, useId, useRef, useState } from 'react'
import type { ExperimentRepository } from '../../data'
import type { Dashboard } from '../../dashboards/types'
import { templateSize } from '../../dashboards/layout'
import { useSortableGrid } from '../../components/useSortableGrid'
import { DashboardWidget } from './DashboardWidget'
import type { DashboardAction } from './dashboardReducer'
import { useDashboardResize } from './useDashboardResize'
import { usePackedDashboard } from './usePackedDashboard'

export function DashboardCanvas({ dashboard, repository, selectedIds, onAction, onAddPlot, onOpen }: {
  dashboard: Dashboard
  repository: ExperimentRepository
  selectedIds: readonly string[]
  onAction: (action: DashboardAction) => void
  onAddPlot: () => void
  onOpen: (id: string, hidden: boolean) => void
}) {
  const sortable = useSortableGrid(dashboard.widgets, (id, targetId) => onAction({ type: 'reorder-widget', id, targetId, fit: packed.fitFor(id, targetId) }), { includeGaps: true })
  const resize = useDashboardResize(sortable.container, onAction)
  const widgets = dashboard.widgets.map(widget => widget.id === resize.preview?.id ? { ...widget, ...resize.preview } : widget)
  const addTileId = useId()
  const addTile = { id: addTileId, size: templateSize(dashboard.layout, widgets.length) }
  const packed = usePackedDashboard(sortable.container, [...widgets, addTile])
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
  const dropFit = sortable.drag?.targetId ? packed.fitFor(sortable.drag.id, sortable.drag.targetId) : {}
  const willResize = Object.keys(dropFit).length > 0
  return <>
    <p className="dashboard-canvas-help" id={sortable.instructionsId}>Drag a plot by its handle to rearrange it; larger plots shrink to fit their destination. Drag its bottom corner handle to resize; plots automatically fill available gaps.<span className="sr-only"> Keyboard: focus the move handle and use arrow keys or Home/End.</span></p>
    <p className="sr-only" id={resize.instructionsId}>Drag to change plot width and height. Keyboard: left/right move the resize edge, up/down change height; hold Shift for larger steps. For right-side plots, drag or press left to widen. Escape cancels resizing.</p>
    <p className="sr-only" role="status" aria-live="polite">{sortable.announcement}</p>
    <p className="sr-only" role="status" aria-live="polite">{resize.announcement}</p>
    <div className={`dashboard-grid${sortable.drag || resize.preview ? ' dashboard-grid-dragging' : ''}`} ref={sortable.container}>
      {widgets.map(widget => <DashboardWidget key={widget.id} widget={widget} repository={repository}
        layoutStyle={packed.styleFor(widget.id)} resizeHandleProps={resize.handleProps(widget, packed.resizeSideFor(widget.id))} resizing={resize.preview?.id === widget.id}
        initiallyEditing={!initialWidgetIds.has(widget.id)}
        selectedIds={selectedIds} onAction={onAction} onOpen={onOpen}
        dragHandleProps={sortable.handleProps(widget.id)} dragging={sortable.drag?.id === widget.id}
        dropPosition={sortable.drag?.targetId === widget.id && from !== to ? (from < to ? 'after' : 'before') : undefined} />)}
      <button data-layout-id={addTileId} style={packed.styleFor(addTileId)} className="dashboard-add-tile" disabled={!repository.getProperties().length} onClick={onAddPlot}>
        <span aria-hidden="true">+</span><strong>{dashboard.widgets.length ? 'Add another plot' : 'Create your first plot'}</strong>
        <small>Choose axes and see your data live</small>
      </button>
    </div>
    {sortable.drag && <div className="dashboard-drag-preview" aria-hidden="true" style={{ left: sortable.drag.x + 14, top: sortable.drag.y + 14 }}>
      {dashboard.widgets.find(widget => widget.id === sortable.drag?.id)?.title || 'Plot'}
      <small>{to >= 0 && to !== from ? `Release to move to position ${to + 1}${willResize ? ' · Resizes to fit' : ''}` : 'Drag over another plot · Esc to cancel'}</small>
    </div>}
  </>
}
