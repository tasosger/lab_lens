import type { CSSProperties } from 'react'
import type { PropertyStatistics } from '../../data'
import { averageDeviationStrength, compareWithAverage } from './averageComparison'
import { formatAverage, formatValue } from '../../format.ts'
import { Icon } from '../../components/Icon'

const labels = {
  above: 'Above average',
  below: 'Below average',
  equal: 'At average',
  unavailable: 'Comparison unavailable',
}

export function AverageReference({ value, reference }: {
  value: number | undefined
  reference: PropertyStatistics | undefined
}) {
  const comparison = compareWithAverage(value, reference?.average)
  const strength = averageDeviationStrength(value, reference?.average)

  return (
    <span className="average-reference">
      <span
        className="reference-value"
        title={reference?.average === undefined
          ? 'No recorded values for this property'
          : `Dataset average: ${formatValue(reference.average)} from ${reference.count} recorded values, including zeros`}
      >
        Dataset avg. {formatAverage(reference?.average)}
      </span>
      <span
        className={`average-badge average-${comparison}`}
        style={{ '--average-strength': strength } as CSSProperties}
        title={comparison === 'above' || comparison === 'below'
          ? 'Darker shades indicate a larger relative difference from the dataset average.'
          : undefined}
      >
        {(comparison === 'above' || comparison === 'below') && <Icon name="arrow" />}
        {labels[comparison]}
      </span>
    </span>
  )
}
