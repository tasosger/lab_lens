const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const scientificFormatter = new Intl.NumberFormat('en-US', { notation: 'scientific', maximumFractionDigits: 2 })

/** Round presentation only; small nonzero measurements must remain distinct from absent inputs. */
export function formatValue(value: number | undefined): string {
  if (value === undefined) return '—'
  if (value === 0) return '0'
  const magnitude = Math.abs(value)
  return magnitude < 0.01 || magnitude >= 1e9
    ? scientificFormatter.format(value).replace('E', 'e')
    : numberFormatter.format(value)
}

export function formatAverage(value: number | undefined): string {
  if (value === undefined) return '—'
  const formatted = formatValue(value)
  return Number(formatted.replaceAll(',', '')) === value ? formatted : `≈ ${formatted}`
}

export const operatorLabels = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: 'between',
} as const
