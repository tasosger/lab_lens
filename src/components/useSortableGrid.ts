import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

interface DragSession { id: string; pointerId: number; startX: number; startY: number; x: number; y: number; started: boolean; targetId: string | null }
interface DragPreview { id: string; targetId: string | null; x: number; y: number }

/** Handle-only sorting keeps pointer interactions inside charts independent of layout editing. */
export function useSortableGrid(items: readonly { id: string; title: string }[], onMove: (id: string, targetId: string) => void) {
  const container = useRef<HTMLDivElement>(null)
  const session = useRef<DragSession | null>(null)
  const [drag, setDrag] = useState<DragPreview | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const instructionsId = useId()
  const dragging = drag !== null

  function targetAt(x: number, y: number): string | null {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sortable-id]')
    return element && container.current?.contains(element) ? element.dataset.sortableId ?? null : null
  }

  function updatePreview(current: DragSession) {
    current.targetId = targetAt(current.x, current.y)
    setDrag({ id: current.id, targetId: current.targetId, x: current.x, y: current.y })
  }

  // Scroll a long dashboard while holding a plot near the viewport edge.
  useEffect(() => {
    if (!dragging) return
    let frame: number
    function tick() {
      const current = session.current
      if (!current) return
      const speed = current.y < 80 ? -12 : current.y > window.innerHeight - 80 ? 12 : 0
      if (speed) { window.scrollBy(0, speed); updatePreview(current) }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [dragging])

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
      setAnnouncement(`Plot moved to position ${position} of ${items.length}.`)
    } else if (current.started) setAnnouncement('Plot position unchanged.')
    session.current = null
    setDrag(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function keyboardMove(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === 'Escape') { event.preventDefault(); cancel(); return }
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
      setAnnouncement(`Plot moved to position ${target + 1} of ${items.length}.`)
    }
  }

  return {
    container, drag, announcement, instructionsId,
    handleProps(id: string) {
      return {
        'aria-label': `Rearrange ${items.find(item => item.id === id)?.title || 'plot'}`,
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
