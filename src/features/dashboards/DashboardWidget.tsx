import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from 'react'
import type { ExperimentRepository } from '../../data'
import type { DashboardWidget as Widget } from '../../dashboards/types'
import { DashboardChart } from './DashboardChart'
import type { DashboardAction } from './dashboardReducer'
import { Icon } from '../../components/Icon'

export function DashboardWidget({ widget, repository, selectedIds, initiallyEditing = false, dragHandleProps, dragging, dropPosition,
  layoutStyle, resizeHandleProps, resizing, onAction, onOpen }: {
  widget: Widget
  repository: ExperimentRepository
  selectedIds: readonly string[]
  initiallyEditing?: boolean
  dragHandleProps: ButtonHTMLAttributes<HTMLButtonElement>
  dragging: boolean
  dropPosition?: 'before' | 'after'
  layoutStyle?: CSSProperties
  resizeHandleProps: ButtonHTMLAttributes<HTMLButtonElement>
  resizing: boolean
  onAction: (action: DashboardAction) => void
  onOpen: (id: string, hidden: boolean) => void
}) {
  const id = useId()
  const [editing, setEditing] = useState(initiallyEditing)
  const titleInput = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) titleInput.current?.focus({ preventScroll: true }) }, [editing])
  const patch = (patch: Partial<Pick<Widget, 'title' | 'size'>>) => onAction({ type: 'update-widget', id: widget.id, patch })
  return (
    <article data-layout-id={widget.id} data-sortable-id={widget.id} data-resizing={resizing}
      style={{ ...layoutStyle, '--dashboard-plot-height': widget.plotHeight ? `${widget.plotHeight}px` : undefined } as CSSProperties}
      className={`dashboard-widget dashboard-widget-${widget.size}${dragging ? ' dashboard-widget-dragging' : ''}${dropPosition ? ` dashboard-drop-${dropPosition}` : ''}`} aria-label={widget.title || 'Untitled plot'}>
      <header className="dashboard-widget-heading">
        <div className="dashboard-widget-title-row">
          <button type="button" className="dashboard-drag-handle" title="Drag to rearrange; arrow keys also move the plot" {...dragHandleProps}>
            <svg width="18" height="22" viewBox="0 0 18 22" fill="currentColor" aria-hidden="true">
              {[5, 11, 17].flatMap(y => [5, 12].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
            </svg>
          </button>
          <h2 className="dashboard-widget-name">{widget.title || 'Untitled plot'}</h2>
          <button className="icon-button dashboard-edit-button" aria-expanded={editing} aria-controls={editing ? `${id}-settings ${id}-controls` : undefined}
            aria-label={`${editing ? 'Finish editing' : 'Edit'} ${widget.title || 'plot'}`}
            title={editing ? 'Finish editing plot' : 'Edit plot'} onClick={() => setEditing(!editing)}>
            <Icon name={editing ? 'check' : 'edit'} />
          </button>
        </div>
        {editing && <div id={`${id}-settings`} className="dashboard-widget-settings" role="group" aria-label="Plot settings">
          <label className="dashboard-widget-title">Plot title
            <input ref={titleInput} value={widget.title} onChange={event => patch({ title: event.target.value })} placeholder="Plot title" />
          </label>
          <div className="dashboard-widget-actions">
            {(widget.columns !== undefined || widget.plotHeight !== undefined) && <button className="text-button" onClick={() => onAction({ type: 'reset-widget-size', id: widget.id })}>Reset size</button>}
            <button className="text-button" onClick={() => onAction({ type: 'remove-widget', id: widget.id })}>Remove</button>
          </div>
        </div>}
      </header>
      <DashboardChart id={id} widgetId={widget.id} configuration={widget.configuration} plotHeight={widget.plotHeight}
        editing={editing} repository={repository} selectedIds={selectedIds} onAction={onAction} onOpen={onOpen} />
      <button type="button" className="dashboard-resize-handle" title="Drag to resize plot" {...resizeHandleProps}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m3 13 10-10M8 13l5-5" /></svg>
      </button>
    </article>
  )
}
