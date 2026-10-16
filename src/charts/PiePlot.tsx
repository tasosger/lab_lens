import { useContext } from 'react'
import { pieColor, pieSlicePath, type PieSlice } from './pie'
import { ChartHeightContext } from './useChartSize'

export function PiePlot({ slices, selectedSliceId, onSelect }: {
  slices: readonly PieSlice[]
  selectedSliceId?: string
  onSelect: (slice: PieSlice) => void
}) {
  const height = useContext(ChartHeightContext)
  return <svg data-chart-surface className="pie-plot" style={height === undefined ? undefined : { height, maxWidth: '100%' }}
    viewBox="-150 -150 300 300" role="group" aria-label="Experiment count by property value">
    {slices.map((slice, index) => <g key={slice.id} className="pie-slice" role="button" tabIndex={0}
      aria-pressed={selectedSliceId === slice.id}
      aria-label={`${slice.label}: ${slice.items.length} experiments, ${(slice.fraction * 100).toFixed(1)} percent. Inspect experiments.`}
      onClick={() => onSelect(slice)} onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(slice) }
      }}>
      <title>{`${slice.label}: ${slice.items.length} experiments (${(slice.fraction * 100).toFixed(1)}%)`}</title>
      <path d={pieSlicePath(slice.startAngle, slice.endAngle)} fill={pieColor(index)} />
      {slice.fraction >= 0.06 && <text x={87 * Math.sin((slice.startAngle + slice.endAngle) / 2)}
        y={-87 * Math.cos((slice.startAngle + slice.endAngle) / 2)} textAnchor="middle" dominantBaseline="central">
        {(slice.fraction * 100).toFixed(0)}%
      </text>}
    </g>)}
  </svg>
}
