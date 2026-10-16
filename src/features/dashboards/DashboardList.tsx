import { useEffect, useRef, useState } from 'react'
import type { Dashboard } from '../../dashboards/types'
import { dashboardIsDirty, type DashboardDraft } from './dashboardReducer'
import { Icon } from '../experiments/Icon'
import { Modal } from '../../components/Modal'
import { InlineNameEditor } from '../../components/InlineNameEditor'

export function DashboardList({ drafts, saved, activeId, renamingId, error, onSelect, onCreate, onDelete, onRename, onNameChange, onFinishRename }: {
  drafts: readonly DashboardDraft[]
  saved: readonly Dashboard[]
  activeId: string | undefined
  renamingId: string | null
  error: string
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => boolean
  onRename: (id: string) => void
  onNameChange: (id: string, value: string) => void
  onFinishRename: (id: string) => void
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const rows = useRef(new Map<string, HTMLDivElement>())
  const focusAfterRename = useRef<string | null>(null)
  useEffect(() => {
    if (!renamingId && focusAfterRename.current) {
      rows.current.get(focusAfterRename.current)?.querySelector<HTMLButtonElement>('.dashboard-list-item')?.focus()
      focusAfterRename.current = null
    }
  }, [renamingId])
  const dashboards = drafts.map(draft => draft.dashboard)
  const deleting = dashboards.find(dashboard => dashboard.id === deleteId)
  return (
    <div className="dashboard-library" aria-label="Dashboard library">
      <button className="dashboard-new-button" aria-label="Add dashboard" onClick={onCreate}>+ Add</button>
      <div className="dashboard-list">
        {dashboards.map(dashboard => (
          <div className="dashboard-list-row" key={dashboard.id} ref={element => { if (element) rows.current.set(dashboard.id, element); else rows.current.delete(dashboard.id) }}>
            {renamingId === dashboard.id ? <InlineNameEditor value={dashboard.name} label="Dashboard name"
              onChange={value => onNameChange(dashboard.id, value)} onFinish={restoreFocus => {
                focusAfterRename.current = restoreFocus ? dashboard.id : null
                onFinishRename(dashboard.id)
              }} /> : <>
            <button className="dashboard-list-item" title={dashboard.name || 'Untitled dashboard'} aria-current={dashboard.id === activeId ? 'true' : undefined} onClick={() => onSelect(dashboard.id)}>
              <strong>{dashboard.name.trim() || 'Untitled dashboard'}</strong>
              {dashboardIsDirty(dashboard, saved) && <span className="dashboard-list-dirty" aria-label="Unsaved changes" title="Unsaved changes">•</span>}
            </button>
            <div className="dashboard-list-actions">
              <button className="dashboard-list-action" aria-label={`Rename ${dashboard.name || 'Untitled dashboard'}`} title="Rename dashboard" onClick={() => onRename(dashboard.id)}><Icon name="edit" /></button>
              <button className="dashboard-list-action dashboard-list-delete" aria-label={`Delete ${dashboard.name || 'Untitled dashboard'}`} title="Delete dashboard" onClick={() => setDeleteId(dashboard.id)}><Icon name="close" /></button>
            </div>
            </>}
          </div>
        ))}
      </div>
      {dashboards.length === 0 && <p className="dashboard-storage-note">No saved dashboards yet.</p>}
      {deleting && <Modal title="Delete dashboard?" onClose={() => setDeleteId(null)}>
        <p>Delete <strong>{deleting.name || 'Untitled dashboard'}</strong>, its plots, and any unsaved changes?</p>
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        <div className="dashboard-modal-actions">
          <button className="button" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="button primary" onClick={() => { if (onDelete(deleting.id)) setDeleteId(null) }}>Delete dashboard</button>
        </div>
      </Modal>}
    </div>
  )
}
