import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
import { clampDrawerWidth, DEFAULT_DRAWER_WIDTH, draggedDrawerWidth, drawerWidthBounds, keyboardDrawerWidth } from './drawerResize'

export function useResizableDrawer() {
  const [preferredWidth, setPreferredWidth] = useState(DEFAULT_DRAWER_WIDTH)
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1024 : window.innerWidth)
  const [resizing, setResizing] = useState(false)
  const drag = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const width = clampDrawerWidth(preferredWidth, viewportWidth)
  const { min, max } = drawerWidthBounds(viewportWidth)

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null
    setResizing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleProps: HTMLAttributes<HTMLDivElement> = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': 'vertical',
    'aria-label': 'Resize experiment details',
    'aria-controls': 'experiment-details',
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': width,
    'aria-valuetext': `${width} pixels wide`,
    title: 'Drag to resize, or use the left and right arrow keys',
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0) return
      event.preventDefault()
      event.currentTarget.focus()
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width }
      setResizing(true)
    },
    onPointerMove(event) {
      const start = drag.current
      if (!start || start.pointerId !== event.pointerId) return
      setPreferredWidth(draggedDrawerWidth(start.startWidth, start.startX, event.clientX, viewportWidth))
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onClick: (event) => event.stopPropagation(),
    onKeyDown(event) {
      const next = keyboardDrawerWidth(width, event.key, viewportWidth, event.shiftKey)
      if (next === undefined) return
      event.preventDefault()
      setPreferredWidth(next)
    },
  }

  return { width, resizing, handleProps }
}
