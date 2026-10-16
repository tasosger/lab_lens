import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropertyDefinition } from '../../data/types'
import { createDashboard } from '../../dashboards/defaults'
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
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const active = drafts.find(draft => draft.dashboard.id === activeId)
  const hasUnsavedChanges = useMemo(() => drafts.some(draft => dashboardIsDirty(draft.dashboard, saved)), [drafts, saved])

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
    setRenamingId(dashboard.id)
    setError('')
  }

  const editDashboard = useCallback((id: string | null, action: DashboardAction) => {
    setDrafts(previous => previous.map(draft => draft.dashboard.id === id ? dashboardReducer(draft, action) : draft))
    setError('')
  }, [])
  const edit = useCallback((action: DashboardAction) => editDashboard(activeId, action), [activeId, editDashboard])

  function save(): boolean {
    if (!active) return false
    try {
      const dashboard = repository.save(active.dashboard)
      setSaved(previous => [...previous.filter(item => item.id !== dashboard.id), dashboard])
      setDrafts(previous => previous.map(draft => draft.dashboard.id === dashboard.id ? { ...draft, dashboard } : draft))
      setError('')
      return true
    } catch (error) { setError(`Dashboard was not saved. ${errorMessage(error)}`); return false }
  }

  function remove(id: string): boolean {
    try {
      if (saved.some(dashboard => dashboard.id === id)) repository.remove(id)
      setSaved(previous => previous.filter(dashboard => dashboard.id !== id))
      setDrafts(previous => previous.filter(draft => draft.dashboard.id !== id))
      if (activeId === id) setActiveId(drafts.find(draft => draft.dashboard.id !== id)?.dashboard.id ?? null)
      setRenamingId(current => current === id ? null : current)
      setError('')
      return true
    } catch (error) { setError(`Dashboard was not deleted. ${errorMessage(error)}`); return false }
  }

  return {
    saved, drafts, active, ready, error, renamingId, save, remove,
    edit,
    rename: (id: string, value: string) => editDashboard(id, { type: 'name', value }),
    beginRename: (id: string) => setRenamingId(id),
    finishRename: (id: string) => setRenamingId(current => current === id ? null : current),
    retry: () => setLoadAttempt(value => value + 1),
    select: (id: string) => { setActiveId(id); setRenamingId(null); setError('') },
    create: () => add(createDashboard(crypto.randomUUID(), 'Untitled dashboard', new Date().toISOString())),
  }
}

export type DashboardLibrary = ReturnType<typeof useDashboardLibrary>
