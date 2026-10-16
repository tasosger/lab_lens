import { buildHistogram, type HistogramBinCount } from '../../charts/histogram.ts'
import type { Experiment, PropertyDefinition } from '../../data/types.ts'
import { matchingExperiments, propertyData } from './experimentData.ts'

/** Count only matching experiments; missing measurements never become zeros. */
export function buildExperimentHistogram(experiments: readonly Experiment[], property: PropertyDefinition,
  binCount: HistogramBinCount = 'auto', matchingIds?: readonly string[]) {
  const matching = matchingIds ? matchingExperiments(experiments, matchingIds) : experiments
  const data = propertyData(matching, property)
  const histogram = buildHistogram(data.items, binCount)
  return { ...histogram, omittedCount: histogram.omittedCount + data.omittedCount }
}
