import type { FilterExpression, FilterGroup, NumericFilter, PropertyDefinition } from '../../data/types.ts'
import { operatorLabels } from './filterLabels.ts'
import { formatValue } from '../../format.ts'

export interface AppliedFilter {
  id: number
  condition: NumericFilter
}

export interface AppliedFilterGroup {
  id: number
  operator: 'and' | 'or'
  filters: AppliedFilterNode[]
}

export type AppliedFilterNode = AppliedFilter | AppliedFilterGroup

export function isAppliedGroup(node: AppliedFilterNode): node is AppliedFilterGroup {
  return 'filters' in node
}

export function updateFilterGroup(
  group: AppliedFilterGroup,
  groupId: number,
  update: (group: AppliedFilterGroup) => AppliedFilterGroup,
): AppliedFilterGroup {
  if (group.id === groupId) return update(group)
  const filters = group.filters.map((node) =>
    isAppliedGroup(node) ? updateFilterGroup(node, groupId, update) : node,
  )
  return filters.every((node, index) => node === group.filters[index])
    ? group
    : { ...group, filters }
}

export function removeFilterNode(group: AppliedFilterGroup, id: number): AppliedFilterGroup {
  return {
    ...group,
    filters: group.filters
      .filter((node) => node.id !== id)
      .map((node) => isAppliedGroup(node) ? removeFilterNode(node, id) : node),
  }
}

export function updateFilterCondition(
  group: AppliedFilterGroup,
  id: number,
  condition: NumericFilter,
): AppliedFilterGroup {
  const filters = group.filters.map((node) => {
    if (isAppliedGroup(node)) return updateFilterCondition(node, id, condition)
    return node.id === id ? { ...node, condition } : node
  })
  return filters.every((node, index) => node === group.filters[index])
    ? group
    : { ...group, filters }
}

export function countConditions(group: AppliedFilterGroup): number {
  return group.filters.reduce((count, node) =>
    count + (isAppliedGroup(node) ? countConditions(node) : 1), 0)
}

/** Empty editor groups are drafts, so never send them to the query API. */
export function toFilterExpression(group: AppliedFilterGroup): FilterGroup | undefined {
  const filters: FilterExpression[] = []
  for (const node of group.filters) {
    const expression = isAppliedGroup(node) ? toFilterExpression(node) : node.condition
    if (expression) filters.push(expression)
  }
  return filters.length ? { operator: group.operator, filters } : undefined
}

export function describeFilterExpression(
  expression: FilterExpression,
  properties: readonly PropertyDefinition[],
): string {
  if ('filters' in expression) {
    return `(${expression.filters.map((child) => describeFilterExpression(child, properties))
      .join(` ${expression.operator.toUpperCase()} `)})`
  }
  const property = properties.find((item) => item.id === expression.propertyId)
  const formatThreshold = (value: number) => expression.scale === 'percentile' ? `P${value}` : formatValue(value)
  const value = expression.operator === 'between'
    ? `${formatThreshold(expression.min)} and ${formatThreshold(expression.max)}`
    : formatThreshold(expression.value)
  return `${property?.name ?? expression.propertyId} ${operatorLabels[expression.operator]} ${value}`
}
