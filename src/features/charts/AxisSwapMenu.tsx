import { useEffect, useRef } from 'react'
import { Icon } from '../experiments/Icon'

export type AxisSwap = 'xy' | 'xz' | 'yz'

export function AxisSwapMenu({ threeDimensional, disabled, onSwap }: {
  threeDimensional: boolean
  disabled: boolean
  onSwap: (pair: AxisSwap) => void
}) {
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (menu.current && event.target instanceof Node && !menu.current.contains(event.target)) menu.current.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  return (
    <details ref={menu} className="chart-axis-swaps"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          if (menu.current) menu.current.open = false
          trigger.current?.focus()
        }
      }}>
      <summary ref={trigger} className="button"><Icon name="swap" />Swap axes<Icon name="chevron" /></summary>
      <div className="chart-swap-options">
        {(threeDimensional ? ['xy', 'xz', 'yz'] as const : ['xy'] as const).map((pair) => (
          <button key={pair} disabled={disabled} aria-label={`Swap ${pair[0].toUpperCase()} and ${pair[1].toUpperCase()} axes`}
            onClick={() => {
              onSwap(pair)
              if (menu.current) menu.current.open = false
              trigger.current?.focus()
            }}>
            {pair[0].toUpperCase()} ↔ {pair[1].toUpperCase()}
          </button>
        ))}
      </div>
    </details>
  )
}
