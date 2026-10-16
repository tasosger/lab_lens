import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

interface DragSession { id: string; pointerId: number; startX: number; startY: number; x: number; y: number; started: boolean; targetId: string | null }
interface DragPreview { id: string; targetId: string | null; x: number; y: number }

/** Handle-only sorting for grids and lists, with optional scrolling inside a panel. */
export function useSortableGrid<T extends HTMLElement = HTMLDivElement>(
  items: readonly { id: string; title: string }[],
  onMove: (id: string, targetId: string) => void,
  { itemLabel = 'Plot', scrollContainer }: { itemLabel?: string; scrollContainer?: RefObject<HTMLElement | null> } = {},
) {
  const container = useRef<T>(null)
  const session = useRef<DragSession | null>(null)
  const [drag, setDrag] = useState<DragPreview | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const instructionsId = useId()
  const dragging = drag !== null

  function targetAt(x: number, y: number): string | null {
    let element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sortable-id]')
    while (element && container.current?.contains(element)) {
      const id = element.dataset.sortableId
      if (items.some(item => item.id === id)) return id!
      // A sortable axis list can live inside a sortable dashboard widget.
      element = element.parentElement?.closest<HTMLElement>('[data-sortable-id]')
    }
    return null
  }

  function updatePreview(current: DragSession) {
    current.targetId = targetAt(current.x, current.y)
    setDrag({ id: current.id, targetId: current.targetId, x: current.x, y: current.y })
  }

  // Scroll the dropdown itself when supplied; dashboards use the viewport.
  useEffect(() => {
    if (!dragging) return
    let frame: number
    function tick() {
      const current = session.current
      if (!current) return
      const panel = scrollContainer?.current
      const bounds = panel?.getBoundingClientRect()
      const top = bounds ? Math.max(0, bounds.top) : 0
      const bottom = bounds ? Math.min(window.innerHeight, bounds.bottom) : window.innerHeight
      const edge = panel ? 40 : 80
      const withinWidth = !bounds || (current.x >= bounds.left && current.x <= bounds.right)
      const speed = withinWidth ? current.y < top + edge ? -12 : current.y > bottom - edge ? 12 : 0 : 0
      if (speed) {
        if (panel) panel.scrollTop += speed
        else window.scrollBy(0, speed)
        updatePreview(current)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [dragging, scrollContainer])

  function cancel() {
    if (session.current?.started) setAnnouncement('Move cancelled.')
    session.current = null
    setDrag(null)
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = session.current
    if (!current || current.pointerId !== event.pointerId) return
    const targetId = targetAt(event.clientX, event.clientY)
    if (current.started && targetId && targetId !== current.id) {
      onMove(current.id, targetId)
      const position = items.findIndex(item => item.id === targetId) + 1
      setAnnouncement(`${itemLabel} moved to position ${position} of ${items.length}.`)
    } else if (current.started) setAnnouncement(`${itemLabel} position unchanged.`)
    session.current = null
    setDrag(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function keyboardMove(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === 'Escape' && session.current) { event.preventDefault(); event.stopPropagation(); cancel(); return }
    if (event.key === 'Tab' && session.current) { cancel(); return }
    if (session.current) return
    const index = items.findIndex(item => item.id === id)
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? index - 1
      : ['ArrowRight', 'ArrowDown'].includes(event.key) ? index + 1 : null
    if (target === null) return
    event.preventDefault()
    const item = items[target]
    if (item && target !== index) {
      onMove(id, item.id)
      setAnnouncement(`${itemLabel} moved to position ${target + 1} of ${items.length}.`)
    }
  }

  return {
    container, drag, announcement, instructionsId,
    handleProps(id: string) {
      return {
        'aria-label': `Rearrange ${items.find(item => item.id === id)?.title || itemLabel.toLowerCase()}`,
        'aria-describedby': instructionsId,
        onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => keyboardMove(event, id),
        onPointerDown(event: PointerEvent<HTMLButtonElement>) {
          if (event.button !== 0 || !event.isPrimary) return
          event.preventDefault()
          event.currentTarget.focus({ preventScroll: true })
          event.currentTarget.setPointerCapture(event.pointerId)
          session.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, started: false, targetId: null }
        },
        onPointerMove(event: PointerEvent<HTMLButtonElement>) {
          const current = session.current
          if (!current || current.pointerId !== event.pointerId) return
          current.x = event.clientX; current.y = event.clientY
          if (!current.started && Math.hypot(current.x - current.startX, current.y - current.startY) < 6) return
          current.started = true
          updatePreview(current)
        },
        onPointerUp: finish,
        onPointerCancel: cancel,
        onLostPointerCapture: cancel,
      }
    },
  }
}
