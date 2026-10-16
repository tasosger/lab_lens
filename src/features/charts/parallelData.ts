import { numericDomain } from '../../charts/numericScale.ts'
import type { ParallelDimension, ParallelLine } from '../../charts/types.ts'
import { getPropertyValue } from '../../data/properties.ts'
import type { Experiment, PropertyDefinition } from '../../data/types.ts'
import { propertyDimension } from './experimentData.ts'

export function buildParallelData(experiments: readonly Experiment[], properties: readonly PropertyDefinition[]) {
  const lines: ParallelLine[] = experiments.flatMap(experiment => {
    const values = properties.map(property => getPropertyValue(experiment, property))
    return properties.length >= 2 && values.every((value): value is number => value !== undefined && Number.isFinite(value))
      ? [{ id: experiment.id, label: experiment.id, values }] : []
  })
  const dimensions: ParallelDimension[] = properties.map((property, index) => ({
    ...propertyDimension(property), domain: numericDomain(lines.map(line => line.values[index]!)),
  }))
  return { dimensions, lines, omittedCount: experiments.length - lines.length }
}
