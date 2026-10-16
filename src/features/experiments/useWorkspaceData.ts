import { useMemo } from 'react'
import type { ExperimentRepository } from '../../data'
import { countConditions } from './filterTree'
import { getFilterTree, getWorkspaceQuery, SELECTION_LIMIT, type WorkspaceState } from './workspaceReducer'

/** Only query inputs invalidate results; selection, drawers, charts, and dashboards do not. */
export function useWorkspaceData(repository: ExperimentRepository, state: WorkspaceState) {
  const { filters, filterMode, search, sort, selectedIds, visibleColumns } = state
  const properties = repository.getProperties()
  const allExperiments = useMemo(() => repository.list().items, [repository])
  const filterTree = useMemo(() => getFilterTree({ filters, filterMode }), [filters, filterMode])
  const filterCount = useMemo(() => countConditions(filterTree), [filterTree])
  const query = useMemo(() => getWorkspaceQuery({ filters, filterMode, search, sort }), [filters, filterMode, search, sort])
  const results = useMemo(() => repository.list(query), [repository, query])
  const matchingIds = useMemo(() => results.items.map(experiment => experiment.id), [results])
  const matchingIdSet = useMemo(() => new Set(matchingIds), [matchingIds])
  const visibleProperties = useMemo(() => {
    const visible = new Set(visibleColumns)
    return properties.filter(property => visible.has(property.id))
  }, [properties, visibleColumns])
  const selectedExperiments = useMemo(() => selectedIds.flatMap(id => {
    const experiment = repository.getById(id)
    return experiment ? [experiment] : []
  }), [repository, selectedIds])
  const hiddenSelectionCount = selectedIds.filter(id => !matchingIdSet.has(id)).length

  return { properties, allExperiments, filterTree, filterCount, results, matchingIds, matchingIdSet,
    visibleProperties, selectedExperiments, hiddenSelectionCount,
    selectionFull: selectedIds.length >= SELECTION_LIMIT, isFiltered: Boolean(search.trim() || filterCount) }
}

export type WorkspaceData = ReturnType<typeof useWorkspaceData>
