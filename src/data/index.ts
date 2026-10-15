import dataset from './experiments.json' with { type: 'json' }
import { createExperimentRepository } from './repository.ts'
import type { ExperimentRepository } from './types.ts'

let repository: ExperimentRepository | undefined

/** Validate and cache on first use so callers can catch errors and show an error state. */
export function getExperimentRepository(): ExperimentRepository {
  repository ??= createExperimentRepository(dataset)
  return repository
}

export { createExperimentRepository } from './repository.ts'
export { getPropertyValue } from './properties.ts'
export { QueryValidationError } from './query.ts'
export { DatasetValidationError } from './validation.ts'
export type {
  Experiment,
  ExperimentList,
  ExperimentQuery,
  ExperimentRepository,
  ExperimentSort,
  FilterExpression,
  FilterGroup,
  NumericFilter,
  PropertyDefinition,
  PropertyGroup,
  PropertyId,
} from './types.ts'
