import { buildHistogram, histogramBinLabel, type HistogramBinCount, type HistogramDatum } from './histogram.ts'

export type PieGrouping = 'ranges' | 'values'
export interface PieSlice {
  readonly id: string
  readonly label: string
  readonly items: readonly HistogramDatum[]
  readonly fraction: number
  readonly startAngle: number
  readonly endAngle: number
}

/** Slices are counts of experiments, never sums of measurements with mixed units. */
export function buildPieData(items: readonly HistogramDatum[], grouping: PieGrouping, bins: HistogramBinCount,
  format: (value: number) => string = String) {
  const finite = items.filter(item => Number.isFinite(item.value))
  let groups: { id: string; label: string; items: readonly HistogramDatum[] }[]
  if (grouping === 'ranges') {
    groups = buildHistogram(finite, bins).bins.filter(bin => bin.items.length).map(bin => ({
      id: `range:${bin.lower}:${bin.upper}`, label: histogramBinLabel(bin, format), items: bin.items,
    }))
  } else {
    const values = new Map<number, HistogramDatum[]>()
    for (const item of finite) {
      const group = values.get(item.value) ?? []
      group.push(item)
      values.set(item.value, group)
    }
    const labels = new Map<string, number>()
    for (const value of values.keys()) labels.set(format(value), (labels.get(format(value)) ?? 0) + 1)
    groups = [...values].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([value, entries]) => ({ id: `value:${value}`, label: labels.get(format(value))! > 1 ? String(value) : format(value), items: entries }))
  }
  let offset = 0
  const slices: PieSlice[] = groups.map(group => {
    const startAngle = offset / finite.length * Math.PI * 2
    offset += group.items.length
    return { ...group, fraction: group.items.length / finite.length, startAngle, endAngle: offset / finite.length * Math.PI * 2 }
  })
  return { slices, count: finite.length, omittedCount: items.length - finite.length }
}

export function pieSlicePath(start: number, end: number, radius = 130): string {
  const point = (angle: number) => `${radius * Math.sin(angle)} ${-radius * Math.cos(angle)}`
  if (end - start >= Math.PI * 2 - 1e-12) return `M 0 ${-radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 ${-radius} Z`
  return `M 0 0 L ${point(start)} A ${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${point(end)} Z`
}

export function pieColor(index: number): string {
  return `hsl(${Math.round(index * 137.508) % 360} 52% 48%)`
}
