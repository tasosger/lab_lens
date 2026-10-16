import type { ExperimentQuery, ExperimentSort, PropertyDefinition, PropertyId } from '../../data/types.ts'
import { createChartConfiguration, reduceChartConfiguration } from '../../chart-model/configuration.ts'
import type { ChartAction, ChartConfiguration } from '../../chart-model/types.ts'
import { createFilterEditorState, getFilterEditorTree, reduceFilterEditor, type FilterEditorAction, type FilterEditorState } from './filterEditorState.ts'
import { toFilterExpression, type AppliedFilterGroup } from './filterTree.ts'

export const SELECTION_LIMIT = 100
export type WorkspaceView = 'explore' | 'compare' | 'charts' | 'dashboards'

export interface WorkspaceState extends FilterEditorState {
  chart: ChartConfiguration
  activeView: WorkspaceView
  search: string
  sort: ExperimentSort
  visibleColumns: PropertyId[]
  selectedIds: string[]
  baselineId: string | null
  differencesOnly: boolean
  openExperimentId: string | null
}

export type WorkspaceAction =
  | ChartAction
  | FilterEditorAction
  | { type: 'view'; view: WorkspaceView }
  | { type: 'baseline'; id: string }
  | { type: 'differences-only'; value: boolean }
  | { type: 'search'; value: string }
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
    chart: createChartConfiguration(properties),
    search: '',
    ...createFilterEditorState(),
    sort: { field: 'id', direction: 'asc' },
    visibleColumns: properties.filter((property) => property.group === 'outputs').map((property) => property.id),
    selectedIds: [],
    baselineId: null,
    differencesOnly: false,
    openExperimentId: null,
  }
}

export function getFilterTree(state: Pick<WorkspaceState, 'filters' | 'filterMode'>): AppliedFilterGroup {
  return getFilterEditorTree(state)
}

/** Keep the UI and its integration tests on the same query-construction path. */
export function getWorkspaceQuery(state: Pick<WorkspaceState, 'filters' | 'filterMode' | 'search' | 'sort'>): ExperimentQuery {
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
    case 'add-filter-group':
    case 'update-filter':
    case 'remove-filter':
    case 'filter-mode': return reduceFilterEditor(state, action)
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
    // TypeScript narrows the remaining actions to ChartAction. New charts need no routing here.
    default: {
      const chart = reduceChartConfiguration(state.chart, action)
      return chart === state.chart ? state : { ...state, chart }
    }
  }
}
