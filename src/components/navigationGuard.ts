export type LeaveDecision = 'save' | 'leave' | 'cancel'

/** A failed save must never execute the pending navigation. */
export function resolveNavigation(decision: LeaveDecision, save: () => boolean, proceed: () => void): boolean {
  if (decision === 'cancel' || (decision === 'save' && !save())) return false
  proceed()
  return true
}
