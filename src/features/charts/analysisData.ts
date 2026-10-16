import { pearsonCorrelation } from '../../charts/correlation.ts'
import type { HistogramDatum } from '../../charts/histogram.ts'
import { numericDomain } from '../../charts/numericScale.ts'
import { getPropertyValue } from '../../data/properties.ts'
import type { Experiment, PropertyDefinition, PropertyId } from '../../data/types.ts'

export function matchingExperiments(experiments: readonly Experiment[], matchingIds: readonly string[]): readonly Experiment[] {
  const matching = new Set(matchingIds)
  return experiments.filter(experiment => matching.has(experiment.id))
}

export function propertyData(experiments: readonly Experiment[], property: PropertyDefinition) {
  const items: HistogramDatum[] = []
  for (const experiment of experiments) {
    const value = getPropertyValue(experiment, property)
    if (value !== undefined && Number.isFinite(value)) items.push({ id: experiment.id, label: experiment.id, value })
  }
  return { items, omittedCount: experiments.length - items.length }
}

export function selectedProperties(properties: readonly PropertyDefinition[], ids: readonly PropertyId[]) {
  const byId = new Map(properties.map(property => [property.id, property]))
  return [...new Set(ids)].flatMap(id => { const property = byId.get(id); return property ? [property] : [] })
}

export function buildCorrelationMatrix(experiments: readonly Experiment[], columns: readonly PropertyDefinition[], rows: readonly PropertyDefinition[]) {
  return rows.map(y => ({ property: y, cells: columns.map(x => ({ x, y,
    ...pearsonCorrelation(experiments.map(experiment => [getPropertyValue(experiment, x), getPropertyValue(experiment, y)] as const)),
  })) }))
}

export function buildParallelData(experiments: readonly Experiment[], properties: readonly PropertyDefinition[]) {
  const lines = experiments.flatMap(experiment => {
    const values = properties.map(property => getPropertyValue(experiment, property))
    return properties.length >= 2 && values.every((value): value is number => value !== undefined && Number.isFinite(value))
      ? [{ id: experiment.id, label: experiment.id, values }] : []
  })
  const dimensions = properties.map((property, index) => ({
    id: property.id, label: property.name, group: property.group,
    domain: numericDomain(lines.map(line => line.values[index]!)),
  }))
  return { dimensions, lines, omittedCount: experiments.length - lines.length }
}
