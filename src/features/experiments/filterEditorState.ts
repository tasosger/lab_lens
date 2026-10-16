import type { FilterExpression, NumericFilter } from '../../data/types.ts'
import { removeFilterNode, toFilterExpression, updateFilterCondition, updateFilterGroup, type AppliedFilterGroup, type AppliedFilterNode } from './filterTree.ts'

export interface FilterEditorState {
  filters: AppliedFilterNode[]
  filterMode: 'and' | 'or'
  nextFilterId: number
}

export type FilterEditorAction =
  | { type: 'add-filter'; condition: NumericFilter; groupId?: number }
  | { type: 'update-filter'; id: number; condition: NumericFilter }
  | { type: 'add-filter-group'; groupId: number }
  | { type: 'remove-filter'; id: number }
  | { type: 'filter-mode'; mode: 'and' | 'or'; groupId?: number }
  | { type: 'clear-filters' }

export function getFilterEditorTree(state: Pick<FilterEditorState, 'filters' | 'filterMode'>): AppliedFilterGroup {
  return { id: 0, operator: state.filterMode, filters: state.filters }
}

/** Rebuild editor identities once when opening saved semantic filters. */
export function createFilterEditorState(expressions: readonly FilterExpression[] = []): FilterEditorState {
  let nextFilterId = 1
  const root = expressions.length === 1 && 'filters' in expressions[0]
    ? expressions[0] : { operator: 'and' as const, filters: expressions }
  const convert = (expression: FilterExpression): AppliedFilterNode => {
    const id = nextFilterId++
    return 'filters' in expression
      ? { id, operator: expression.operator, filters: expression.filters.map(convert) }
      : { id, condition: expression }
  }
  const filters = root.filters.map(convert)
  return { filters, filterMode: root.operator, nextFilterId }
}

export function filterEditorExpressions(state: FilterEditorState): readonly FilterExpression[] {
  const expression = toFilterExpression(getFilterEditorTree(state))
  return expression ? [expression] : []
}

export function reduceFilterEditor<T extends FilterEditorState>(state: T, action: FilterEditorAction): T {
  const root = getFilterEditorTree(state)
  switch (action.type) {
    case 'add-filter':
    case 'add-filter-group': {
      const updated = updateFilterGroup(root, action.groupId ?? 0, (group) => ({
        ...group,
        filters: [...group.filters, action.type === 'add-filter'
          ? { id: state.nextFilterId, condition: action.condition }
          : { id: state.nextFilterId, operator: group.operator === 'and' ? 'or' : 'and', filters: [] }],
      }))
      return updated === root ? state : { ...state, filters: updated.filters, nextFilterId: state.nextFilterId + 1 }
    }
    case 'update-filter': {
      const updated = updateFilterCondition(root, action.id, action.condition)
      return updated === root ? state : { ...state, filters: updated.filters }
    }
    case 'remove-filter': return { ...state, filters: removeFilterNode(root, action.id).filters }
    case 'filter-mode': {
      const updated = updateFilterGroup(root, action.groupId ?? 0, (group) => ({ ...group, operator: action.mode }))
      return { ...state, filters: updated.filters, filterMode: updated.operator }
    }
    case 'clear-filters': return { ...state, filters: [] }
  }
}
