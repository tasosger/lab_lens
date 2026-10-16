import { buildHistogram, type HistogramBinCount, type HistogramDatum } from '../../charts/histogram.ts'
import { getPropertyValue } from '../../data/properties.ts'
import type { Experiment, PropertyDefinition } from '../../data/types.ts'

/** Count only matching experiments; missing measurements never become zeros. */
export function buildExperimentHistogram(experiments: readonly Experiment[], property: PropertyDefinition,
  binCount: HistogramBinCount = 'auto', matchingIds?: readonly string[]) {
  const matching = matchingIds ? new Set(matchingIds) : null
  const items: HistogramDatum[] = []
  let missing = 0
  for (const experiment of experiments) {
    if (matching && !matching.has(experiment.id)) continue
    const value = getPropertyValue(experiment, property)
    if (value === undefined || !Number.isFinite(value)) { missing++; continue }
    items.push({ id: experiment.id, label: experiment.id, value })
  }
  const histogram = buildHistogram(items, binCount)
  return { ...histogram, omittedCount: histogram.omittedCount + missing }
}
