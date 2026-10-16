import { isAbsentInput, isIngredientInput } from '../../data/inputPresence.ts'
import type { Experiment, PropertyDefinition } from '../../data/types.ts'
import type { ChartConfiguration } from '../../chart-model/configuration.ts'
import { chartDefinitions } from '../../chart-model/registry.ts'

/** Only properties used by this chart can exclude experiments. */
export function chartIngredientInputs(configuration: ChartConfiguration, properties: readonly PropertyDefinition[]) {
  const ids = chartDefinitions[configuration.chartType].propertyIds(configuration)
  const active = new Set(ids)
  return properties.filter(property => active.has(property.id) && isIngredientInput(property))
}

export function excludeChartZeroInputs(experiments: readonly Experiment[], configuration: ChartConfiguration, properties: readonly PropertyDefinition[]) {
  // Heatmaps exclude zeros separately for each cell, rather than intersecting all axes.
  if (!configuration.hideZeroInputs || chartDefinitions[configuration.chartType].zeroInputPolicy === 'pair') return experiments
  const inputs = chartIngredientInputs(configuration, properties)
  if (!inputs.length) return experiments
  return experiments.filter(experiment => !inputs.some(property => isAbsentInput(experiment, property)))
}
