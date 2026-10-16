import type { ExperimentRepository } from '../../data'
import { createDashboardWidget } from '../../dashboards/defaults'
import { DashboardCanvas } from './DashboardCanvas'
import { DashboardLayoutPicker } from './DashboardLayoutPicker'
import type { DashboardAction, DashboardDraft } from './dashboardReducer'

export function DashboardEditor({ draft, dirty, repository, selectedIds, onAction, onSave, onOpen }: {
  draft: DashboardDraft
  dirty: boolean
  repository: ExperimentRepository
  selectedIds: readonly string[]
  onAction: (action: DashboardAction) => void
  onSave: () => void
  onOpen: (id: string, hidden: boolean) => void
}) {
  const { dashboard } = draft
  const properties = repository.getProperties()
  const addPlot = () => onAction({ type: 'add-widget', widget: { ...createDashboardWidget(crypto.randomUUID(), properties), title: `Plot ${dashboard.widgets.length + 1}` } })

  return (
    <div className="dashboard-editor">
      <div className="dashboard-toolbar">
        <DashboardLayoutPicker layout={dashboard.layout} onChoose={template => onAction({ type: 'template', template })} />
        <button className="button" disabled={!properties.length} onClick={addPlot}>Add plot</button>
        <div className="dashboard-save-actions">
          <span role="status" aria-live="polite" className={dirty ? 'dashboard-dirty' : 'dashboard-saved'}>{dirty ? 'Unsaved changes' : 'Saved'}</span>
          <button className="button primary" onClick={onSave} disabled={!dirty}>Save dashboard</button>
        </div>
      </div>
      <DashboardCanvas dashboard={dashboard} repository={repository} selectedIds={selectedIds}
        onAction={onAction} onAddPlot={addPlot} onOpen={onOpen} />
    </div>
  )
}
