import type { CartesianRange } from '../../charts/types.ts'
import type { NumericFilter, PropertyId } from '../../data/types.ts'
import type { ChartAxes } from './scatterData.ts'

export interface PropertyRangeFilter {
  readonly xPropertyId: PropertyId
  readonly yPropertyId: PropertyId
  readonly range: CartesianRange
}

export function propertyRangeConditions(filter: PropertyRangeFilter | null): readonly NumericFilter[] {
  if (!filter) return []
  return [
    { propertyId: filter.xPropertyId, operator: 'between', min: filter.range.x[0], max: filter.range.x[1] },
    { propertyId: filter.yPropertyId, operator: 'between', min: filter.range.y[0], max: filter.range.y[1] },
  ]
}

/** Filters stay attached to their properties when axes change or swap. */
export function rangeForAxes(filter: PropertyRangeFilter | null, axes: ChartAxes): CartesianRange | null {
  if (!filter) return null
  if (filter.xPropertyId === axes.x && filter.yPropertyId === axes.y) return filter.range
  if (filter.xPropertyId === axes.y && filter.yPropertyId === axes.x) return { x: filter.range.y, y: filter.range.x }
  return null
}
