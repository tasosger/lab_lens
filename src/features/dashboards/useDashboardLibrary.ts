import { useEffect, useState } from 'react'
import type { PropertyDefinition } from '../../data/types'
import { createDashboard, duplicateDashboard } from '../../dashboards/defaults'
import { createLocalDashboardStorage } from '../../dashboards/localStorageAdapter'
import { createDashboardRepository } from '../../dashboards/repository'
import type { Dashboard } from '../../dashboards/types'
import { createDashboardDraft, dashboardIsDirty, dashboardReducer, type DashboardAction, type DashboardDraft } from './dashboardReducer'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Browser storage is unavailable.'
}

export function useDashboardLibrary(properties: readonly PropertyDefinition[]) {
  const [repository] = useState(() => createDashboardRepository(createLocalDashboardStorage(), properties))
  const [saved, setSaved] = useState<readonly Dashboard[]>([])
  const [drafts, setDrafts] = useState<DashboardDraft[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const active = drafts.find(draft => draft.dashboard.id === activeId)
  const hasUnsavedChanges = drafts.some(draft => dashboardIsDirty(draft.dashboard, saved))

  useEffect(() => {
    try {
      const dashboards = repository.list()
      setSaved(dashboards)
      setDrafts(dashboards.map(createDashboardDraft))
      setActiveId(dashboards[0]?.id ?? null)
      setReady(true)
      setError('')
    } catch (error) { setError(`Could not load dashboards. ${errorMessage(error)}`) }
  }, [repository, loadAttempt])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', preventLoss)
    return () => window.removeEventListener('beforeunload', preventLoss)
  }, [hasUnsavedChanges])

  function add(dashboard: Dashboard) {
    setDrafts(previous => [...previous, createDashboardDraft(dashboard)])
    setActiveId(dashboard.id)
    setError('')
  }

  function edit(action: DashboardAction) {
    setDrafts(previous => previous.map(draft => draft.dashboard.id === activeId ? dashboardReducer(draft, action) : draft))
    setError('')
  }

  function save() {
    if (!active) return
    try {
      const dashboard = repository.save(active.dashboard)
      setSaved(previous => [...previous.filter(item => item.id !== dashboard.id), dashboard])
      setDrafts(previous => previous.map(draft => draft.dashboard.id === dashboard.id ? { ...draft, dashboard } : draft))
      setError('')
    } catch (error) { setError(`Dashboard was not saved. ${errorMessage(error)}`) }
  }

  function remove(id: string) {
    try {
      if (saved.some(dashboard => dashboard.id === id)) repository.remove(id)
      setSaved(previous => previous.filter(dashboard => dashboard.id !== id))
      setDrafts(previous => previous.filter(draft => draft.dashboard.id !== id))
      if (activeId === id) setActiveId(drafts.find(draft => draft.dashboard.id !== id)?.dashboard.id ?? null)
      setError('')
    } catch (error) { setError(`Dashboard was not deleted. ${errorMessage(error)}`) }
  }

  return {
    saved, drafts, active, ready, error, edit, save, remove,
    retry: () => setLoadAttempt(value => value + 1),
    select: (id: string) => { setActiveId(id); setError('') },
    create: () => add(createDashboard(crypto.randomUUID(), 'Untitled dashboard', new Date().toISOString())),
    duplicate: () => { if (active) add(duplicateDashboard(active.dashboard, () => crypto.randomUUID(), new Date().toISOString())) },
  }
}
