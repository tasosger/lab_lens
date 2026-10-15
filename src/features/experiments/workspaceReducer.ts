import type { ExperimentQuery, ExperimentSort, NumericFilter, PropertyDefinition, PropertyId } from '../../data/types.ts'
import {
  removeFilterNode,
  toFilterExpression,
  updateFilterGroup,
  type AppliedFilterGroup,
  type AppliedFilterNode,
} from './filterTree.ts'

export const SELECTION_LIMIT = 4
export type WorkspaceView = 'explore' | 'compare'

export interface WorkspaceState {
  activeView: WorkspaceView
  search: string
  filters: AppliedFilterNode[]
  filterMode: 'and' | 'or'
  nextFilterId: number
  sort: ExperimentSort
  visibleColumns: PropertyId[]
  selectedIds: string[]
  baselineId: string | null
  differencesOnly: boolean
  openExperimentId: string | null
}

export type WorkspaceAction =
  | { type: 'view'; view: WorkspaceView }
  | { type: 'baseline'; id: string }
  | { type: 'differences-only'; value: boolean }
  | { type: 'search'; value: string }
  | { type: 'add-filter'; condition: NumericFilter; groupId?: number }
  | { type: 'add-filter-group'; groupId: number }
  | { type: 'remove-filter'; id: number }
  | { type: 'filter-mode'; mode: 'and' | 'or'; groupId?: number }
  | { type: 'clear-filters' }
  | { type: 'reset-query' }
  | { type: 'sort'; field: ExperimentSort['field'] }
  | { type: 'toggle-column'; propertyId: PropertyId }
  | { type: 'reset-columns'; propertyIds: PropertyId[] }
  | { type: 'toggle-selection'; id: string }
  | { type: 'clear-selection' }
  | { type: 'open-experiment'; id: string | null }

export function createWorkspaceState(properties: readonly PropertyDefinition[]): WorkspaceState {
  return {
    activeView: 'explore',
    search: '',
    filters: [],
    filterMode: 'and',
    nextFilterId: 1,
    sort: { field: 'id', direction: 'asc' },
    visibleColumns: properties.filter((property) => property.group === 'outputs').map((property) => property.id),
    selectedIds: [],
    baselineId: null,
    differencesOnly: false,
    openExperimentId: null,
  }
}

export function getFilterTree(state: WorkspaceState): AppliedFilterGroup {
  return { id: 0, operator: state.filterMode, filters: state.filters }
}

/** Keep the UI and its integration tests on the same query-construction path. */
export function getWorkspaceQuery(state: WorkspaceState): ExperimentQuery {
  const expression = toFilterExpression(getFilterTree(state))
  return { search: state.search, filters: expression ? [expression] : [], sort: state.sort }
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'view': return { ...state, activeView: action.view }
    case 'baseline': return state.selectedIds.includes(action.id)
      ? { ...state, baselineId: action.id }
      : state
    case 'differences-only': return { ...state, differencesOnly: action.value }
    case 'search': return { ...state, search: action.value }
    case 'add-filter':
    case 'add-filter-group': {
      const root = getFilterTree(state)
      const updated = updateFilterGroup(root, action.groupId ?? 0, (group) => ({
        ...group,
        filters: [...group.filters, action.type === 'add-filter'
          ? { id: state.nextFilterId, condition: action.condition }
          : { id: state.nextFilterId, operator: group.operator === 'and' ? 'or' : 'and', filters: [] }],
      }))
      if (updated === root) return state
      return { ...state, filters: updated.filters, nextFilterId: state.nextFilterId + 1 }
    }
    case 'remove-filter': return {
      ...state,
      filters: removeFilterNode(getFilterTree(state), action.id).filters,
    }
    case 'filter-mode': {
      const root = updateFilterGroup(getFilterTree(state), action.groupId ?? 0,
        (group) => ({ ...group, operator: action.mode }))
      return { ...state, filters: root.filters, filterMode: root.operator }
    }
    case 'clear-filters': return { ...state, filters: [] }
    case 'reset-query': return { ...state, search: '', filters: [] }
    case 'sort': return {
      ...state,
      sort: { field: action.field, direction: state.sort.field === action.field && state.sort.direction === 'asc' ? 'desc' : 'asc' },
    }
    case 'toggle-column': {
      const isVisible = state.visibleColumns.includes(action.propertyId)
      return {
        ...state,
        visibleColumns: isVisible
          ? state.visibleColumns.filter((id) => id !== action.propertyId)
          : [...state.visibleColumns, action.propertyId],
        sort: isVisible && state.sort.field === action.propertyId ? { field: 'id', direction: 'asc' } : state.sort,
      }
    }
    case 'reset-columns': return {
      ...state,
      visibleColumns: action.propertyIds,
      sort: state.sort.field !== 'id' && !action.propertyIds.includes(state.sort.field) ? { field: 'id', direction: 'asc' } : state.sort,
    }
    case 'toggle-selection': {
      const isSelected = state.selectedIds.includes(action.id)
      if (!isSelected && state.selectedIds.length >= SELECTION_LIMIT) return state
      const selectedIds = isSelected
        ? state.selectedIds.filter((id) => id !== action.id)
        : [...state.selectedIds, action.id]
      return {
        ...state,
        selectedIds,
        baselineId: state.baselineId && selectedIds.includes(state.baselineId)
          ? state.baselineId
          : selectedIds[0] ?? null,
      }
    }
    case 'clear-selection': return { ...state, selectedIds: [], baselineId: null }
    case 'open-experiment': return { ...state, openExperimentId: action.id }
  }
}
