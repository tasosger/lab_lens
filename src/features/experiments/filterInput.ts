import type { FilterScale, NumericFilter, PropertyId } from '../../data/types.ts'
import { formatValue } from '../../format.ts'

export type ThresholdField = 'value' | 'max'
type FilterInputResult = { condition: NumericFilter } | { error: string; fields: ThresholdField[]; incomplete?: boolean }

export function parseFilterInput({ propertyId, operator, scale, value, max }: {
  propertyId: PropertyId | ''
  operator: NumericFilter['operator']
  scale: FilterScale
  value: string
  max: string
}): FilterInputResult {
  if (!propertyId) return { error: 'Choose a property.', fields: [], incomplete: true }
  const numericValue = Number(value)
  const numericMax = Number(max)
  const entries: { field: ThresholdField; raw: string; number: number }[] = [{ field: 'value', raw: value, number: numericValue }]
  if (operator === 'between') entries.push({ field: 'max', raw: max, number: numericMax })
  const invalid = entries.filter(entry => entry.raw.trim() && (!Number.isFinite(entry.number)
    || (scale === 'percentile' && (entry.number < 0 || entry.number > 100))))
  if (invalid.length) return { error: scale === 'percentile' ? 'Enter percentiles between 0 and 100.' : 'Enter a valid number.',
    fields: invalid.map(entry => entry.field) }
  const missing = entries.filter(entry => !entry.raw.trim())
  if (missing.length) return { error: scale === 'percentile' ? 'Enter a percentile between 0 and 100.' : 'Enter a valid number.',
    fields: missing.map(entry => entry.field), incomplete: true }
  if (operator === 'between' && numericMax < numericValue) {
    return { error: 'Enter an upper bound greater than or equal to the lower bound.', fields: ['value', 'max'] }
  }
  return { condition: operator === 'between'
    ? { propertyId, operator, scale, min: numericValue, max: numericMax }
    : { propertyId, operator, scale, value: numericValue } }
}

/** Warnings never block valid absolute filters; a Between interval must be entirely outside. */
export function absoluteRangeWarning(condition: NumericFilter, sortedValues: readonly number[]): string {
  if (condition.scale === 'percentile' || !sortedValues.length) return ''
  const min = sortedValues[0]!
  const max = sortedValues[sortedValues.length - 1]!
  const outside = condition.operator === 'between' ? condition.max < min || condition.min > max
    : condition.value < min || condition.value > max
  if (!outside) return ''
  return `${condition.operator === 'between' ? 'Selected interval is' : 'Value is'} outside the recorded range (${formatValue(min)} to ${formatValue(max)}). You can still apply this filter.`
}
