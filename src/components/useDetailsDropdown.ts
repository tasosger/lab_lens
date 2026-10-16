import { useEffect, useRef, type FocusEvent, type KeyboardEvent } from 'react'

/** Native details semantics with the dismissal behavior expected of a dropdown. */
export function useDetailsDropdown() {
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)

  const close = (restoreFocus = false) => {
    if (menu.current) menu.current.open = false
    if (restoreFocus) trigger.current?.focus()
  }

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current && event.target instanceof Node && !menu.current.contains(event.target)) menu.current.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  return {
    trigger,
    close,
    menuProps: {
      ref: menu,
      onBlur: (event: FocusEvent<HTMLDetailsElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      },
      onKeyDown: (event: KeyboardEvent<HTMLDetailsElement>) => {
        if (event.key === 'Escape' && event.currentTarget.open) {
          event.preventDefault()
          event.stopPropagation()
          close(true)
        }
      },
    },
  }
}
