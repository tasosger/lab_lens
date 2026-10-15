import { compareNames, getPropertyValue } from './properties.ts'
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
  const requireProperty = (id: PropertyId): PropertyDefinition => {
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
  if (sort.direction !== 'asc' && sort.direction !== 'desc') {
    throw new QueryValidationError('Sort direction must be asc or desc')
  }

  const compileFilter = (filter: FilterExpression): ((experiment: Experiment) => boolean) => {
    if (filter === null || typeof filter !== 'object') {
      throw new QueryValidationError('Each filter must be a numeric condition or logical group')
    }
    if (isFilterGroup(filter)) {
      if (!Array.isArray(filter.filters) || filter.filters.length === 0) {
        throw new QueryValidationError(`An ${filter.operator} group requires a non-empty filters array`)
      }
      const children = filter.filters.map(compileFilter)
      return filter.operator === 'and'
        ? (experiment) => children.every((matches) => matches(experiment))
        : (experiment) => children.some((matches) => matches(experiment))
    }

    validateFilter(filter)
    const property = requireProperty(filter.propertyId)
    return (experiment) => matchesFilter(getPropertyValue(experiment, property), filter)
  }

  // Compile every branch before evaluation so short-circuiting cannot hide invalid filters.
  const conditions = filters.map(compileFilter)
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
