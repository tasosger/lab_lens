import { useDetailsDropdown } from '../../components/useDetailsDropdown'
import { Icon } from '../experiments/Icon'

export type AxisSwap = 'xy' | 'xz' | 'yz'

export function AxisSwapMenu({ threeDimensional, disabled, onSwap }: {
  threeDimensional: boolean
  disabled: boolean
  onSwap: (pair: AxisSwap) => void
}) {
  const dropdown = useDetailsDropdown()

  return (
    <details {...dropdown.menuProps} className="chart-axis-swaps">
      <summary ref={dropdown.trigger} className="button"><Icon name="swap" />Swap axes<Icon name="chevron" /></summary>
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
