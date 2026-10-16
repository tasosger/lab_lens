import { isHistogramBinCount } from '../charts/histogram.ts'
import type { PropertyDefinition, PropertyId } from '../data/types.ts'

export class ChartValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'ChartValidationError' }
}

export function chartRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ChartValidationError('Invalid chart structure.')
  return value as Record<string, unknown>
}

/** Dataset-aware readers shared by chart definitions and the persistence boundary. */
export function createChartReader(properties: readonly PropertyDefinition[]) {
  const ids = new Set(properties.map(property => property.id))
  function property(value: unknown): PropertyId {
    if (typeof value !== 'string' || !ids.has(value as PropertyId)) throw new ChartValidationError(`Unknown chart property: ${String(value)}`)
    return value as PropertyId
  }
  return {
    property,
    optionalProperty: (value: unknown) => value === null ? null : property(value),
    properties(value: unknown, fallback: readonly PropertyId[]): PropertyId[] {
      if (value === undefined) return [...fallback]
      if (!Array.isArray(value)) throw new ChartValidationError('Invalid chart property list.')
      const result = value.map(property)
      if (new Set(result).size !== result.length) throw new ChartValidationError('Duplicate chart property.')
      return result
    },
    bins(value: unknown, label: string) {
      if (!isHistogramBinCount(value)) throw new ChartValidationError(`Invalid ${label} bin count.`)
      return value
    },
  }
}

export type ChartReader = ReturnType<typeof createChartReader>
