import { buildProperties } from './properties.ts'
import { queryExperiments } from './query.ts'
import type { ExperimentQuery, ExperimentRepository } from './types.ts'
import { parseExperiments } from './validation.ts'

/** A synchronous, read-only API backed by a validated JSON snapshot. */
export function createExperimentRepository(data: unknown): ExperimentRepository {
  const experiments = parseExperiments(data)
  const byId = new Map(experiments.map((experiment) => [experiment.id, experiment]))
  const properties = buildProperties(experiments)
  const propertiesById = new Map(properties.map((property) => [property.id, property]))

  return Object.freeze({
    list(query: ExperimentQuery = {}) {
      const items = Object.freeze(queryExperiments(experiments, propertiesById, query))
      return Object.freeze({ items, total: experiments.length, matched: items.length })
    },
    getById(id: string) {
      return byId.get(id)
    },
    getProperties() {
      return properties
    },
  })
}
