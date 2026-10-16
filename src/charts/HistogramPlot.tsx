import { useId, useState } from 'react'
import { CartesianChart } from './CartesianChart'
import { ChartTooltip } from './ChartTooltip'
import { histogramBinLabel, type HistogramBin, type HistogramData } from './histogram'

/** Counts always start at zero; selected records are a subset of each full bar. */
export function HistogramPlot({ data, label, selectedIds, selectedBin, onSelectBin, formatValue }: {
  data: HistogramData
  label: string
  selectedIds: readonly string[]
  selectedBin?: HistogramBin
  onSelectBin: (bin: HistogramBin) => void
  formatValue: (value: number) => string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const tooltipId = useId()
  const active = data.bins[hovered ?? focused ?? -1]
  const selected = new Set(selectedIds)
  const selectedCount = (bin: HistogramBin) => bin.items.filter(item => selected.has(item.id)).length
  const max = Math.max(1, ...data.bins.map(bin => bin.items.length))
  const step = Math.max(1, Math.ceil(max / 4))
  const upper = Math.ceil(max / step) * step
  const ticks = Array.from({ length: upper / step + 1 }, (_, index) => index * step)

  return (
    <CartesianChart title={`Distribution of ${label}`}
      description={`${data.count} experiments in ${data.bins.length} bins. Hover or focus a bar for its range and count. Click, Enter, or Space lists its experiments. Dark segments show selected experiments within the total.`}
      xAxis={{ label, domain: data.domain }} yAxis={{ label: 'Experiment count', domain: [0, upper], ticks }}
      overlay={layout => active && (
        <ChartTooltip id={tooltipId} width={layout.width} height={layout.height}
          x={layout.xScale(active.lower)} y={layout.yScale(active.items.length)}>
          <strong>{histogramBinLabel(active, formatValue)}</strong>
          <dl><div><dt>Experiments</dt><dd>{active.items.length}</dd></div>
            <div><dt>Selected</dt><dd>{selectedCount(active)}</dd></div></dl>
        </ChartTooltip>
      )}>
      {layout => data.bins.map((bin, index) => {
        const x = bin.lower === bin.upper ? layout.left : layout.xScale(bin.lower)
        const right = bin.lower === bin.upper ? layout.right : layout.xScale(bin.upper)
        const gap = Math.min(2, (right - x) / 8)
        const width = Math.max(0, right - x - gap)
        const y = layout.yScale(bin.items.length)
        const selectedY = layout.yScale(selectedCount(bin))
        return (
          <g key={`${bin.lower}:${bin.upper}`} className="histogram-bar" role="button" tabIndex={0}
            aria-label={`${histogramBinLabel(bin, formatValue)}. ${bin.items.length} experiments, ${selectedCount(bin)} selected. Inspect experiments.`}
            aria-pressed={selectedBin === bin} aria-describedby={active === bin ? tooltipId : undefined}
            onPointerEnter={() => setHovered(index)} onPointerLeave={() => setHovered(null)}
            onFocus={() => setFocused(index)} onBlur={() => setFocused(null)} onClick={() => onSelectBin(bin)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectBin(bin) }
              if (event.key === 'Escape') { setHovered(null); setFocused(null) }
            }}>
            <rect className="histogram-total" x={x + gap / 2} y={y} width={width} height={layout.bottom - y} />
            <rect className="histogram-selected" x={x + gap / 2} y={selectedY} width={width} height={layout.bottom - selectedY} />
            <rect className="histogram-hit" x={x + gap / 2} y={Math.min(y, layout.bottom - 6)} width={width} height={Math.max(6, layout.bottom - y)} />
            {width >= 28 && <text className="histogram-count" aria-hidden="true" x={x + (right - x) / 2} y={y - 7} textAnchor="middle">{bin.items.length}</text>}
          </g>
        )
      })}
    </CartesianChart>
  )
}
