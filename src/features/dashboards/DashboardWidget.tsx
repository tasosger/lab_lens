import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from 'react'
import type { ExperimentRepository } from '../../data'
import { dashboardWidgetQuery } from '../../dashboards/query'
import type { DashboardWidget as Widget } from '../../dashboards/types'
import { ExperimentChartView } from '../charts/ExperimentChartView'
import { PlotRangeFilterControls } from '../charts/PlotRangeFilterControls'
import { rangeForAxes } from '../charts/propertyRangeFilter'
import type { ChartAction } from '../charts/chartConfiguration'
import type { DashboardAction } from './dashboardReducer'

export function DashboardWidget({ widget, repository, selectedIds, initiallyEditing = false, dragHandleProps, dragging, dropPosition, onAction, onOpen }: {
  widget: Widget
  repository: ExperimentRepository
  selectedIds: readonly string[]
  initiallyEditing?: boolean
  dragHandleProps: ButtonHTMLAttributes<HTMLButtonElement>
  dragging: boolean
  dropPosition?: 'before' | 'after'
  onAction: (action: DashboardAction) => void
  onOpen: (id: string, hidden: boolean) => void
}) {
  const id = useId()
  const [editing, setEditing] = useState(initiallyEditing)
  const titleInput = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) titleInput.current?.focus({ preventScroll: true }) }, [editing])
  const config = widget.configuration
  const properties = repository.getProperties()
  const context = repository.list()
  const matchingIds = repository.list(dashboardWidgetQuery(widget)).items.map(experiment => experiment.id)
  const patch = (patch: Partial<Pick<Widget, 'title' | 'size' | 'plotFilter'>>) => onAction({ type: 'update-widget', id: widget.id, patch })
  const chart = (action: ChartAction) => onAction({ type: 'chart', id: widget.id, action })
  return (
    <article data-sortable-id={widget.id} className={`dashboard-widget dashboard-widget-${widget.size}${dragging ? ' dashboard-widget-dragging' : ''}${dropPosition ? ` dashboard-drop-${dropPosition}` : ''}`} aria-label={widget.title || 'Untitled plot'}>
      <header className="dashboard-widget-heading">
        <div className="dashboard-widget-title-row">
          <button type="button" className="dashboard-drag-handle" title="Drag to rearrange; arrow keys also move the plot" {...dragHandleProps}>
            <svg width="18" height="22" viewBox="0 0 18 22" fill="currentColor" aria-hidden="true">
              {[5, 11, 17].flatMap(y => [5, 12].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
            </svg>
          </button>
          <h2 className="dashboard-widget-name">{widget.title || 'Untitled plot'}</h2>
          {widget.plotFilter && <span className="dashboard-plot-filtered">Filtered</span>}
          <button className="button dashboard-edit-button" aria-expanded={editing} aria-controls={editing ? `${id}-settings ${id}-controls` : undefined}
            aria-label={`${editing ? 'Finish editing' : 'Edit'} ${widget.title || 'plot'}`} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</button>
        </div>
        {editing && <div id={`${id}-settings`} className="dashboard-widget-settings" role="group" aria-label="Plot settings">
          <label className="dashboard-widget-title">Plot title
            <input ref={titleInput} value={widget.title} onChange={event => patch({ title: event.target.value })} placeholder="Plot title" />
          </label>
          <div className="dashboard-widget-actions">
            <label><span className="sr-only">Plot width</span><select value={widget.size} onChange={event => patch({ size: event.target.value as Widget['size'] })}>
              <option value="half">Half width</option><option value="full">Full width</option>
            </select></label>
            <button className="text-button" onClick={() => onAction({ type: 'remove-widget', id: widget.id })}>Remove</button>
          </div>
          {widget.plotFilter && <PlotRangeFilterControls filter={widget.plotFilter} properties={properties} onChange={plotFilter => patch({ plotFilter })} />}
        </div>}
      </header>
      <ExperimentChartView id={id} filterTarget="this plot's results" showControls={editing}
        experiments={context.items} matchingIds={matchingIds} selectedIds={selectedIds} properties={properties}
        configuration={config} onChartAction={chart}
        rangeSelection={rangeForAxes(widget.plotFilter, config.chartAxes)} hasPlotFilter={Boolean(widget.plotFilter)}
        isFiltered={Boolean(widget.plotFilter)}
        onPlotFilter={plotFilter => patch({ plotFilter })}
        onResetQuery={() => patch({ plotFilter: null })} onOpen={experimentId => onOpen(experimentId, !matchingIds.includes(experimentId))} />
    </article>
  )
}
