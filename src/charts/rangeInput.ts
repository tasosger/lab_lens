import { isCartesianRange } from './rangeSelection.ts'
import type { CartesianRange } from './types.ts'

export interface RangeInput {
  xMin: string
  xMax: string
  yMin: string
  yMax: string
}

export function rangeToInput(range: CartesianRange): RangeInput {
  return { xMin: String(range.x[0]), xMax: String(range.x[1]), yMin: String(range.y[0]), yMax: String(range.y[1]) }
}

export function parseRangeInput(input: RangeInput): CartesianRange | null {
  if (Object.values(input).some((value) => !value.trim())) return null
  const range: CartesianRange = { x: [Number(input.xMin), Number(input.xMax)], y: [Number(input.yMin), Number(input.yMax)] }
  return isCartesianRange(range) ? range : null
}
