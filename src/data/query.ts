import { compareNames, getPropertyValue } from './properties.ts'
import { percentileValue, sortedPropertyValues } from './percentiles.ts'
import type {
  Experiment,
  ExperimentQuery,
  FilterExpression,
  FilterGroup,
  NumericFilter,
  PropertyDefinition,
  PropertyId,
} from './types.ts'

export class QueryValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryValidationError'
  }
}

function validateFilter(filter: NumericFilter): void {
  if (filter.scale !== undefined && filter.scale !== 'absolute' && filter.scale !== 'percentile') {
    throw new QueryValidationError(`Unknown filter scale: ${String(filter.scale)}`)
  }
  const operator = filter.operator
  switch (operator) {
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      if (!Number.isFinite(filter.value)) {
        throw new QueryValidationError(`Filter for ${filter.propertyId} requires a finite number`)
      }
      break
    case 'between':
      if (!Number.isFinite(filter.min) || !Number.isFinite(filter.max)) {
        throw new QueryValidationError(`Range for ${filter.propertyId} requires finite bounds`)
      }
      if (filter.min > filter.max) {
        throw new QueryValidationError(`Range for ${filter.propertyId} has a minimum above its maximum`)
      }
      break
    default:
      throw new QueryValidationError(`Unknown filter operator: ${String(operator)}`)
  }
  if (filter.scale === 'percentile') {
    const bounds = filter.operator === 'between' ? [filter.min, filter.max] : [filter.value]
    if (bounds.some(value => value < 0 || value > 100)) {
      throw new QueryValidationError(`Percentiles for ${filter.propertyId} must be between 0 and 100`)
    }
  }
}

function matchesFilter(value: number | undefined, filter: NumericFilter): boolean {
  if (value === undefined) return false
  switch (filter.operator) {
    case 'eq': return value === filter.value
    case 'neq': return value !== filter.value
    case 'gt': return value > filter.value
    case 'gte': return value >= filter.value
    case 'lt': return value < filter.value
    case 'lte': return value <= filter.value
    case 'between': return value >= filter.min && value <= filter.max
  }
}

function isFilterGroup(filter: FilterExpression): filter is FilterGroup {
  return filter.operator === 'and' || filter.operator === 'or'
}

export function queryExperiments(
  experiments: readonly Experiment[],
  properties: ReadonlyMap<PropertyId, PropertyDefinition>,
  query: ExperimentQuery,
): Experiment[] {
  if (query === null || typeof query !== 'object' || Array.isArray(query)) {
    throw new QueryValidationError('Query must be an object')
  }
  const requireProperty = (id: PropertyId): PropertyDefinition => {
    if (typeof id !== 'string') throw new QueryValidationError('Property ID must be a string')
    const property = properties.get(id)
    if (!property) throw new QueryValidationError(`Unknown property: ${id}`)
    return property
  }

  const { search = '', filters = [], sort = { field: 'id', direction: 'asc' } } = query
  if (typeof search !== 'string') {
    throw new QueryValidationError('Search must be a string')
  }
  if (!Array.isArray(filters)) {
    throw new QueryValidationError('Filters must be an array')
  }
  if (sort === null || typeof sort !== 'object' || Array.isArray(sort)) {
    throw new QueryValidationError('Sort must be an object')
  }
  if (sort.direction !== 'asc' && sort.direction !== 'desc') {
    throw new QueryValidationError('Sort direction must be asc or desc')
  }

  const distributions = new Map<PropertyId, readonly number[]>()
  const ancestors = new Set<FilterExpression>()
  const compileFilter = (filter: FilterExpression, depth = 0): ((experiment: Experiment) => boolean) => {
    if (filter === null || typeof filter !== 'object' || Array.isArray(filter)) {
      throw new QueryValidationError('Each filter must be a numeric condition or logical group')
    }
    if (ancestors.has(filter)) throw new QueryValidationError('Filter groups must not contain cycles')
    if (depth > 100) throw new QueryValidationError('Filter groups must not exceed 100 nesting levels')
    if (isFilterGroup(filter)) {
      if (!Array.isArray(filter.filters) || filter.filters.length === 0) {
        throw new QueryValidationError(`An ${filter.operator} group requires a non-empty filters array`)
      }
      ancestors.add(filter)
      const children = filter.filters.map(child => compileFilter(child, depth + 1))
      ancestors.delete(filter)
      return filter.operator === 'and'
        ? (experiment) => children.every((matches) => matches(experiment))
        : (experiment) => children.some((matches) => matches(experiment))
    }

    validateFilter(filter)
    const property = requireProperty(filter.propertyId)
    if (filter.scale === 'percentile') {
      // Resolve once against the full dataset, before search or any AND/OR conditions.
      let values = distributions.get(property.id)
      if (!values) {
        values = sortedPropertyValues(experiments, property)
        distributions.set(property.id, values)
      }
      if (!values.length) return () => false
      const resolved: NumericFilter = filter.operator === 'between'
        ? { ...filter, scale: 'absolute', min: percentileValue(values, filter.min)!, max: percentileValue(values, filter.max)! }
        : { ...filter, scale: 'absolute', value: percentileValue(values, filter.value)! }
      return experiment => matchesFilter(getPropertyValue(experiment, property), resolved)
    }
    return (experiment) => matchesFilter(getPropertyValue(experiment, property), filter)
  }

  // Compile every branch before evaluation so short-circuiting cannot hide invalid filters.
  const conditions = filters.map(filter => compileFilter(filter))
  const sortProperty = sort.field === 'id' ? undefined : requireProperty(sort.field)
  const normalizedSearch = search.trim().toLowerCase()
  const matches = experiments.filter((experiment) =>
    experiment.id.toLowerCase().includes(normalizedSearch)
    && conditions.every((matches) => matches(experiment)),
  )

  const direction = sort.direction === 'asc' ? 1 : -1
  return matches.sort((left, right) => {
    if (!sortProperty) return direction * compareNames(left.id, right.id)

    const leftValue = getPropertyValue(left, sortProperty)
    const rightValue = getPropertyValue(right, sortProperty)
    // Missing values stay last for either direction; ties always use ID ascending.
    if (leftValue === undefined && rightValue !== undefined) return 1
    if (rightValue === undefined && leftValue !== undefined) return -1
    if (leftValue !== undefined && rightValue !== undefined && leftValue !== rightValue) {
      return direction * (leftValue < rightValue ? -1 : 1)
    }
    return compareNames(left.id, right.id)
  })
}
