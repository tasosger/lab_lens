import { getPropertyValue } from './properties.ts'
import type { Experiment, PropertyDefinition } from './types.ts'

/** Missing values are omitted; recorded zeros remain part of the distribution. */
export function sortedPropertyValues(experiments: readonly Experiment[], property: PropertyDefinition): number[] {
  return experiments.flatMap(experiment => {
    const value = getPropertyValue(experiment, property)
    return value === undefined ? [] : [value]
  }).sort((left, right) => left - right)
}

/** Linear interpolation at (n - 1) * p / 100, on ascending finite values. */
export function percentileValue(sortedValues: readonly number[], percentile: number): number | undefined {
  if (!Number.isFinite(percentile) || percentile < 0 || percentile > 100 || !sortedValues.length) return undefined
  const position = (sortedValues.length - 1) * (percentile / 100)
  const lower = sortedValues[Math.floor(position)]!
  const upper = sortedValues[Math.ceil(position)]!
  const fraction = position - Math.floor(position)
  if (lower === upper || fraction === 0) return lower
  // Avoid overflow when the endpoints have opposite signs and extreme magnitudes.
  return lower < 0 && upper > 0
    ? lower * (1 - fraction) + upper * fraction
    : lower + (upper - lower) * fraction
}
