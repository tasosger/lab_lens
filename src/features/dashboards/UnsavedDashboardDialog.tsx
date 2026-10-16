import { Modal } from '../../components/Modal'
import type { LeaveDecision } from '../../components/navigationGuard'

export function UnsavedDashboardDialog({ name, error, onDecide }: {
  name: string
  error: string
  onDecide: (decision: LeaveDecision) => void
}) {
  return <Modal title="Save your changes?" onClose={() => onDecide('cancel')}>
    <p>You have unsaved changes in <strong>{name || 'Untitled dashboard'}</strong>.</p>
    <p>Save before leaving. If you leave without saving, this draft stays available until you refresh or close the page.</p>
    {error && <p className="dashboard-error" role="alert">{error}</p>}
    <div className="dashboard-modal-actions">
      <button className="button" onClick={() => onDecide('cancel')}>Keep editing</button>
      <button className="button" onClick={() => onDecide('leave')}>Leave without saving</button>
      <button className="button primary" onClick={() => onDecide('save')}>Save and leave</button>
    </div>
  </Modal>
}
