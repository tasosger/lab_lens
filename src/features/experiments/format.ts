const numberFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 15 })
const averageFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 })

export function formatValue(value: number | undefined): string {
  return value === undefined ? '—' : numberFormatter.format(value)
}

export function formatAverage(value: number | undefined): string {
  if (value === undefined) return '—'
  const formatted = averageFormatter.format(value)
  return formatted === formatValue(value) ? formatted : `≈ ${formatted}`
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
