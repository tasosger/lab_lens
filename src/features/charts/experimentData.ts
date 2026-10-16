import type { ChartDimension, NumericDatum } from '../../charts/types.ts'
import { getPropertyValue } from '../../data/properties.ts'
import type { Experiment, PropertyDefinition, PropertyId } from '../../data/types.ts'

export function matchingExperiments(experiments: readonly Experiment[], matchingIds: readonly string[]): readonly Experiment[] {
  const matching = new Set(matchingIds)
  return experiments.filter(experiment => matching.has(experiment.id))
}

/** Shared by count-based charts; missing measurements never become zeros. */
export function propertyData(experiments: readonly Experiment[], property: PropertyDefinition) {
  const items: NumericDatum[] = []
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

export function propertyDimension(property: PropertyDefinition): ChartDimension<PropertyId> {
  return { id: property.id, label: property.name, groupLabel: property.group === 'inputs' ? 'Input' : 'Output' }
}
