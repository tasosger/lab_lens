import { getPropertyValue } from './properties.ts'
import type { Experiment, PropertyDefinition, PropertyStatistics } from './types.ts'

/** Full-dataset arithmetic means. Include zero amounts and exclude missing measurements. */
export function buildStatistics(
  experiments: readonly Experiment[],
  properties: readonly PropertyDefinition[],
): readonly PropertyStatistics[] {
  return Object.freeze(properties.map((property) => {
    const values = experiments
      .map((experiment) => getPropertyValue(experiment, property))
      .filter((value): value is number => value !== undefined)
    const scale = values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0)
    // Scaling prevents the sum from overflowing for large, finite measurements.
    const average = values.length === 0
      ? undefined
      : scale === 0
        ? 0
        : (values.reduce((sum, value) => sum + value / scale, 0) / values.length) * scale

    return Object.freeze({ propertyId: property.id, average, count: values.length })
  }))
}
