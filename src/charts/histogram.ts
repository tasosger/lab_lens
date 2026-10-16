import { numericDomain } from './numericScale.ts'
import type { NumericDomain } from './types.ts'

export const MAX_HISTOGRAM_BINS = 50
export type HistogramBinCount = 'auto' | number

export interface HistogramDatum {
  readonly id: string
  readonly label: string
  readonly value: number
}

export interface HistogramBin {
  readonly lower: number
  readonly upper: number
  readonly includeUpper: boolean
  readonly items: readonly HistogramDatum[]
}

export interface HistogramData {
  readonly bins: readonly HistogramBin[]
  readonly domain: NumericDomain
  readonly count: number
  readonly omittedCount: number
}

export function isHistogramBinCount(value: unknown): value is HistogramBinCount {
  return value === 'auto' || (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_HISTOGRAM_BINS)
}

/** Equal-width bins: lower inclusive, upper exclusive, except the final upper bound. */
export function buildHistogram(items: readonly HistogramDatum[], binCount: HistogramBinCount = 'auto'): HistogramData {
  if (!isHistogramBinCount(binCount)) throw new RangeError(`Choose between 1 and ${MAX_HISTOGRAM_BINS} bins, or auto.`)
  const values = items.filter(item => Number.isFinite(item.value))
  const count = values.length
  const omittedCount = items.length - count
  if (!count) return { bins: [], domain: [0, 1], count, omittedCount }
  let min = Infinity
  let max = -Infinity
  for (const item of values) {
    min = Math.min(min, item.value)
    max = Math.max(max, item.value)
  }
  if (min === max) return {
    bins: [{ lower: min, upper: max, includeUpper: true, items: values }],
    domain: numericDomain([min]), count, omittedCount,
  }
  const requested = binCount === 'auto' ? Math.min(MAX_HISTOGRAM_BINS, Math.ceil(Math.sqrt(count))) : binCount
  const span = max - min
  const edges = [min]
  for (let index = 1; index < requested; index++) {
    const fraction = index / requested
    // Use a direct span for ordinary ranges; weighted endpoints avoid overflow.
    const edge = Number.isFinite(span) ? min + span * fraction : min * (1 - fraction) + max * fraction
    // Very narrow floating-point ranges may have fewer representable boundaries.
    if (edge > edges[edges.length - 1]! && edge < max) edges.push(edge)
  }
  edges.push(max)
  const bins = edges.slice(0, -1).map((lower, index) => ({
    lower, upper: edges[index + 1]!, includeUpper: index === edges.length - 2, items: [] as HistogramDatum[],
  }))
  for (const item of values) {
    let low = 0
    let high = bins.length - 1
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (item.value < bins[middle]!.upper) high = middle
      else low = middle + 1
    }
    bins[low]!.items.push(item)
  }
  return { bins, domain: [min, max], count, omittedCount }
}

export function histogramBinLabel(bin: HistogramBin, format: (value: number) => string): string {
  let lower = format(bin.lower)
  let upper = format(bin.upper)
  if (bin.lower === bin.upper) return `Value = ${lower}`
  if (lower === upper) { lower = String(bin.lower); upper = String(bin.upper) }
  return `${lower} ≤ value ${bin.includeUpper ? '≤' : '<'} ${upper}`
}
