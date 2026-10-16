import type { FilterScale, NumericFilter, PropertyId } from '../../data/types.ts'

type Thresholds = { value: string; max: string }
export interface FilterDraft {
  propertyId: PropertyId | ''
  operator: NumericFilter['operator']
  scale: FilterScale
  thresholds: Thresholds
}

export function createFilterDraft(propertyId: PropertyId | '', condition?: NumericFilter): FilterDraft {
  const scale = condition?.scale ?? 'absolute'
  const thresholds = condition ? {
    value: String(condition.operator === 'between' ? condition.min : condition.value),
    max: condition.operator === 'between' ? String(condition.max) : '',
  } : { value: '', max: '' }
  return { propertyId: condition?.propertyId ?? propertyId, operator: condition?.operator ?? 'gte', scale, thresholds }
}

export type FilterDraftAction =
  | { type: 'property'; propertyId: PropertyId }
  | { type: 'operator'; operator: NumericFilter['operator'] }
  | { type: 'scale'; scale: FilterScale }
  | { type: 'threshold'; field: keyof Thresholds; value: string }

export function reduceFilterDraft(draft: FilterDraft, action: FilterDraftAction): FilterDraft {
  switch (action.type) {
    case 'property': return { ...draft, propertyId: action.propertyId }
    case 'operator': return { ...draft, operator: action.operator }
    case 'scale': return { ...draft, scale: action.scale }
    case 'threshold': return { ...draft, thresholds: { ...draft.thresholds, [action.field]: action.value } }
  }
}
