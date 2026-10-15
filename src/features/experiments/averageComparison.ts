export type AverageComparison = 'above' | 'below' | 'equal' | 'unavailable'

export function compareWithAverage(
  value: number | undefined,
  average: number | undefined,
): AverageComparison {
  if (value === undefined || average === undefined) return 'unavailable'
  // Ignore only floating-point rounding noise, not differences hidden by display formatting.
  const tolerance = Number.EPSILON * 4 * Math.max(Math.abs(value), Math.abs(average))
  if (Math.abs(value - average) <= tolerance) return 'equal'
  return value > average ? 'above' : 'below'
}

/** Relative distance from the mean, capped at a 100% difference for color intensity. */
export function averageDeviationStrength(
  value: number | undefined,
  average: number | undefined,
): number {
  if (value === undefined || average === undefined || compareWithAverage(value, average) === 'equal') return 0
  // A nonzero value has no finite percentage difference from a zero mean.
  if (average === 0) return 1
  return Math.min(1, Math.abs(value - average) / Math.abs(average))
}
