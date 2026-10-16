import type { ExperimentQuery, NumericFilter } from '../../data/types.ts'
import { toFilterExpression, updateFilterCondition, updateFilterGroup, type AppliedFilterGroup } from './filterTree.ts'

export type FilterEditTarget = { kind: 'add' | 'edit'; id: number }

/** Preview the entire pending query without changing applied filters or percentile populations. */
export function previewFilterQuery(group: AppliedFilterGroup, target: FilterEditTarget, condition: NumericFilter, search = ''): ExperimentQuery {
  const draft = target.kind === 'edit'
    ? updateFilterCondition(group, target.id, condition)
    : updateFilterGroup(group, target.id, current => ({ ...current, filters: [...current.filters, { id: -1, condition }] }))
  const expression = toFilterExpression(draft)
  return { search, filters: expression ? [expression] : [] }
}
