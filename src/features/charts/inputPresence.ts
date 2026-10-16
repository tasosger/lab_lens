import { isAbsentInput, isIngredientInput } from '../../data/inputPresence.ts'
import type { Experiment, PropertyDefinition, PropertyId } from '../../data/types.ts'
import type { ChartConfiguration } from './chartConfiguration.ts'

/** Only properties used by this chart can exclude experiments. */
export function chartIngredientInputs(configuration: ChartConfiguration, properties: readonly PropertyDefinition[]) {
  let ids: readonly (PropertyId | null)[]
  switch (configuration.chartType) {
    case 'histogram': ids = [configuration.histogramProperty]; break
    case 'pie': ids = [configuration.pieProperty]; break
    case 'heatmap': ids = [...configuration.heatmapX, ...configuration.heatmapY]; break
    case 'parallel': ids = configuration.parallelProperties; break
    // Old saved configurations may still have a Z axis; only X/Y are displayed.
    case 'scatterplot': ids = [configuration.chartAxes.x, configuration.chartAxes.y]; break
  }
  const active = new Set(ids)
  return properties.filter(property => active.has(property.id) && isIngredientInput(property))
}

export function excludeChartZeroInputs(experiments: readonly Experiment[], configuration: ChartConfiguration, properties: readonly PropertyDefinition[]) {
  // Heatmaps exclude zeros separately for each cell, rather than intersecting all axes.
  if (!configuration.hideZeroInputs || configuration.chartType === 'heatmap') return experiments
  const inputs = chartIngredientInputs(configuration, properties)
  if (!inputs.length) return experiments
  return experiments.filter(experiment => !inputs.some(property => isAbsentInput(experiment, property)))
}
