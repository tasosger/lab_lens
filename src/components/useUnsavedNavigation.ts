import { useState } from 'react'
import { resolveNavigation, type LeaveDecision } from './navigationGuard'

export function useUnsavedNavigation(dirty: boolean, save: () => boolean) {
  const [pending, setPending] = useState<(() => void) | null>(null)
  return {
    pending: pending !== null,
    request(proceed: () => void) {
      if (dirty) setPending(() => proceed)
      else proceed()
    },
    decide(decision: LeaveDecision) {
      if (decision === 'cancel') setPending(null)
      else if (pending && resolveNavigation(decision, save, pending)) setPending(null)
    },
  }
}
