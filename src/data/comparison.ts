import { getPropertyValue } from './properties.ts'
import type { Experiment, PropertyDefinition } from './types.ts'

export interface ComparisonValue {
  readonly experimentId: string
  readonly value: number | undefined
  readonly delta: number | undefined
}

export interface ComparisonRow {
  readonly property: PropertyDefinition
  readonly differs: boolean
  readonly values: readonly ComparisonValue[]
}

export interface ExperimentComparison {
  readonly baselineId: string | null
  readonly rows: readonly ComparisonRow[]
}

/** Compare source values; selection order and property order are preserved. */
export function compareExperiments(
  experiments: readonly Experiment[],
  properties: readonly PropertyDefinition[],
  baselineId: string | null = null,
): ExperimentComparison {
  const baseline = experiments.find((experiment) => experiment.id === baselineId) ?? experiments[0]
  if (!baseline) return Object.freeze({ baselineId: null, rows: Object.freeze([]) })

  const rows = properties.map((property): ComparisonRow => {
    const reference = getPropertyValue(baseline, property)
    const values = experiments.map((experiment): ComparisonValue => {
      const value = getPropertyValue(experiment, property)
      const difference = value === undefined || reference === undefined ? undefined : value - reference
      return Object.freeze({
        experimentId: experiment.id,
        value,
        // A subtraction can overflow even when both source measurements are finite.
        delta: difference !== undefined && Number.isFinite(difference) ? (difference === 0 ? 0 : difference) : undefined,
      })
    })
    return Object.freeze({
      property,
      differs: values.some((cell) => cell.value !== values[0].value),
      values: Object.freeze(values),
    })
  })
  return Object.freeze({ baselineId: baseline.id, rows: Object.freeze(rows) })
}
