import { CartesianRangeEditor } from './CartesianRangeEditor'
import type { CartesianRange } from './types'

export function CartesianRangeControls({ selecting, onSelectingChange, value, xLabel, yLabel, onApply }: {
  selecting: boolean
  onSelectingChange: (selecting: boolean) => void
  value: CartesianRange
  xLabel: string
  yLabel: string
  onApply: (range: CartesianRange) => void
}) {
  return (
    <div className="chart-range-tools">
      <div className="chart-range-mode">
        <button type="button" className={`button${selecting ? ' active' : ''}`} aria-pressed={selecting}
          onClick={() => onSelectingChange(!selecting)}>
          {selecting ? 'Finish selecting' : 'Select range'}
        </button>
        <span>{selecting ? 'Drag a rectangle to filter. Escape cancels a drag.' : 'Select a range to filter the linked views.'}</span>
      </div>
      <details>
        <summary>Enter numeric bounds</summary>
        <CartesianRangeEditor value={value} xLabel={xLabel} yLabel={yLabel} onApply={onApply} />
      </details>
    </div>
  )
}
