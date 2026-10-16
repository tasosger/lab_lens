import { useId } from 'react'
import type { ExperimentRepository } from '../../data'
import { dashboardQuery } from '../../dashboards/query'
import type { Dashboard, DashboardWidget as Widget } from '../../dashboards/types'
import { ScatterPlotView } from '../charts/ScatterPlotView'
import { PlotRangeFilterControls } from '../charts/PlotRangeFilterControls'
import { rangeForAxes } from '../charts/propertyRangeFilter'
import type { ChartAction } from '../charts/chartConfiguration'
import type { DashboardAction } from './dashboardReducer'

export function DashboardWidget({ widget, dashboard, repository, matchingIds, selectedIds, index, onAction, onOpen }: {
  widget: Widget
  dashboard: Dashboard
  repository: ExperimentRepository
  matchingIds: readonly string[]
  selectedIds: readonly string[]
  index: number
  onAction: (action: DashboardAction) => void
  onOpen: (id: string) => void
}) {
  const id = useId()
  const config = widget.configuration
  const properties = repository.getProperties()
  const context = repository.list(dashboardQuery(dashboard, widget.id))
  const patch = (patch: Partial<Pick<Widget, 'title' | 'size' | 'plotFilter'>>) => onAction({ type: 'update-widget', id: widget.id, patch })
  const chart = (action: ChartAction) => onAction({ type: 'chart', id: widget.id, action })
  return (
    <article className={`dashboard-widget dashboard-widget-${widget.size}`} aria-label={widget.title || 'Untitled plot'}>
      <header className="dashboard-widget-heading">
        <label className="dashboard-widget-title"><span className="sr-only">Plot title</span>
          <input value={widget.title} onChange={event => patch({ title: event.target.value })} placeholder="Plot title" />
        </label>
        <div className="dashboard-widget-actions">
          <label><span className="sr-only">Plot width</span><select value={widget.size} onChange={event => patch({ size: event.target.value as Widget['size'] })}>
            <option value="half">Half width</option><option value="full">Full width</option>
          </select></label>
          <button className="text-button" disabled={index === 0} aria-label={`Move ${widget.title} earlier`} onClick={() => onAction({ type: 'move-widget', id: widget.id, offset: -1 })}>Earlier</button>
          <button className="text-button" disabled={index === dashboard.widgets.length - 1} aria-label={`Move ${widget.title} later`} onClick={() => onAction({ type: 'move-widget', id: widget.id, offset: 1 })}>Later</button>
          <button className="text-button" onClick={() => onAction({ type: 'add-widget', widget: { ...structuredClone(widget), id: crypto.randomUUID(), title: `${widget.title} copy`, plotFilter: null } })}>Duplicate</button>
          <button className="text-button" onClick={() => onAction({ type: 'remove-widget', id: widget.id })}>Remove</button>
        </div>
      </header>
      {widget.plotFilter && <PlotRangeFilterControls filter={widget.plotFilter} properties={properties} onChange={plotFilter => patch({ plotFilter })} />}
      <ScatterPlotView id={id} filterTarget="the other dashboard plots"
        experiments={context.items} matchingIds={matchingIds} selectedIds={selectedIds} properties={properties}
        axes={config.chartAxes} mode={config.chartMode} zPropertyId={config.chartZ} camera={config.chartCamera}
        rangeSelection={rangeForAxes(widget.plotFilter, config.chartAxes)} hasPlotFilter={Boolean(widget.plotFilter)}
        isFiltered={Boolean(dashboard.search.trim() || dashboard.filters.length || dashboard.widgets.some(w => w.plotFilter))}
        onAxisChange={(axis, propertyId) => chart({ type: 'chart-axis', axis, propertyId })}
        onSwapAxes={pair => chart({ type: 'swap-chart-axes', pair })}
        onModeChange={mode => chart({ type: 'chart-mode', mode })}
        onZChange={propertyId => chart({ type: 'chart-z', propertyId })}
        onCameraChange={camera => chart({ type: 'chart-camera', camera })}
        onPlotFilter={plotFilter => patch({ plotFilter })}
        onResetQuery={() => onAction({ type: 'reset-filters' })} onOpen={onOpen} />
    </article>
  )
}
