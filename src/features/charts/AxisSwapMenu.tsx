import { useDetailsDropdown } from '../../components/useDetailsDropdown'
import { Icon } from '../../components/Icon'
import type { AxisSwap } from '../../chart-model/types.ts'

export function AxisSwapMenu({ threeDimensional, disabled, onSwap }: {
  threeDimensional: boolean
  disabled: boolean
  onSwap: (pair: AxisSwap) => void
}) {
  const dropdown = useDetailsDropdown()

  if (!threeDimensional) return (
    <button type="button" className="icon-button chart-swap-button" disabled={disabled}
      aria-label="Swap X and Y axes" title="Swap X and Y axes" onClick={() => onSwap('xy')}>
      <Icon name="swap" />
    </button>
  )

  return (
    <details {...dropdown.menuProps} className="chart-axis-swaps">
      <summary ref={dropdown.trigger} className="icon-button chart-swap-button" aria-label="Swap axes" title="Swap axes"><Icon name="swap" /></summary>
      <div className="chart-swap-options">
        {(threeDimensional ? ['xy', 'xz', 'yz'] as const : ['xy'] as const).map((pair) => (
          <button key={pair} disabled={disabled} aria-label={`Swap ${pair[0].toUpperCase()} and ${pair[1].toUpperCase()} axes`}
            onClick={() => {
              onSwap(pair)
              dropdown.close(true)
            }}>
            {pair[0].toUpperCase()} ↔ {pair[1].toUpperCase()}
          </button>
        ))}
      </div>
    </details>
  )
}
