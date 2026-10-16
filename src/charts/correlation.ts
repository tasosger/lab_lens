import type { ChartDimension } from './types.ts'

export interface Correlation {
  readonly value: number | null
  readonly count: number
  readonly unavailable: 'too-few-pairs' | 'constant-values' | null
}

export interface CorrelationCell<Id extends string = string> extends Correlation {
  readonly x: ChartDimension<Id>
  readonly y: ChartDimension<Id>
}

export interface CorrelationRow<Id extends string = string> {
  readonly property: ChartDimension<Id>
  readonly cells: readonly CorrelationCell<Id>[]
}

/** Pearson's r from paired finite observations; missing values are never imputed. */
export function pearsonCorrelation(pairs: readonly (readonly [number | undefined, number | undefined])[]): Correlation {
  const complete = pairs.filter((pair): pair is readonly [number, number] =>
    pair[0] !== undefined && pair[1] !== undefined && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
  const count = complete.length
  if (count < 3) return { value: null, count, unavailable: 'too-few-pairs' }
  let xMagnitude = 0
  let yMagnitude = 0
  for (const [x, y] of complete) {
    xMagnitude = Math.max(xMagnitude, Math.abs(x))
    yMagnitude = Math.max(yMagnitude, Math.abs(y))
  }
  if (!xMagnitude || !yMagnitude) return { value: null, count, unavailable: 'constant-values' }
  // Scaling before centering keeps squares and sums finite at extreme magnitudes.
  const scaled = complete.map(([x, y]) => [x / xMagnitude, y / yMagnitude] as const)
  let xMean = 0
  let yMean = 0
  scaled.forEach(([x, y], index) => { xMean += (x - xMean) / (index + 1); yMean += (y - yMean) / (index + 1) })
  let xx = 0
  let yy = 0
  let xy = 0
  for (const [x, y] of scaled) {
    const dx = x - xMean
    const dy = y - yMean
    xx += dx * dx
    yy += dy * dy
    xy += dx * dy
  }
  if (!xx || !yy) return { value: null, count, unavailable: 'constant-values' }
  const value = Math.max(-1, Math.min(1, xy / Math.sqrt(xx) / Math.sqrt(yy)))
  return { value: Object.is(value, -0) ? 0 : value, count, unavailable: null }
}

export function correlationDescription(result: Correlation): string {
  if (result.unavailable === 'too-few-pairs') return 'At least 3 paired values are required.'
  if (result.unavailable === 'constant-values') return 'Correlation is undefined when either property is constant.'
  return `Pearson r = ${result.value!.toFixed(3)}`
}
