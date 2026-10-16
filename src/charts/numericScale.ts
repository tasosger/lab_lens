import type { NumericDomain, NumericScale } from './types.ts'

/** Pad observed values without forcing a zero baseline or losing constant series. */
export function numericDomain(values: readonly number[]): NumericDomain {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (min === Infinity) return [0, 1]
  if (min === 0 && max === 0) return [-1, 1]

  // Normalize before subtraction to keep extreme finite ranges usable.
  const magnitude = Math.max(Math.abs(min), Math.abs(max))
  const padding = min === max ? 0.1 : (max / magnitude - min / magnitude) * 0.08
  const lower = Math.max(-Number.MAX_VALUE, (min / magnitude - padding) * magnitude)
  const upper = Math.min(Number.MAX_VALUE, (max / magnitude + padding) * magnitude)
  if (lower === upper) return [min - Number.MIN_VALUE, max + Number.MIN_VALUE]
  return [lower, upper]
}

export function linearScale(domain: NumericDomain, range: NumericDomain): NumericScale {
  const magnitude = Math.max(Math.abs(domain[0]), Math.abs(domain[1]), Number.MIN_VALUE)
  const lower = domain[0] / magnitude
  const span = domain[1] / magnitude - lower
  const project = (value: number) => span === 0
    ? range[0] / 2 + range[1] / 2
    : range[0] + ((value / magnitude - lower) / span) * (range[1] - range[0])
  return Object.assign(project, {
    invert(position: number) {
      const fraction = range[0] === range[1] ? 0.5 : (position - range[0]) / (range[1] - range[0])
      // Weighted endpoints avoid overflowing the difference of extreme domains.
      return domain[0] * (1 - fraction) + domain[1] * fraction
    },
  })
}

export function numericTicks(domain: NumericDomain, count = 5): readonly number[] {
  const length = Math.max(2, Math.floor(count))
  return Array.from({ length }, (_, index) => {
    const fraction = index / (length - 1)
    return domain[0] * (1 - fraction) + domain[1] * fraction
  })
}

const tickFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 })
const scientificFormatter = new Intl.NumberFormat('en-US', { notation: 'scientific', maximumSignificantDigits: 3 })

export function formatTick(value: number): string {
  const magnitude = Math.abs(value)
  return magnitude !== 0 && (magnitude >= 100_000 || magnitude < 0.001)
    ? scientificFormatter.format(value)
    : tickFormatter.format(Object.is(value, -0) ? 0 : value)
}
