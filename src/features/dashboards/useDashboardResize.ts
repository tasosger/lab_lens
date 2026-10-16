import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { DASHBOARD_GAP, resizePlot, type PlotDimensions, type ResizeSide } from '../../dashboards/packing'
import type { DashboardWidget } from '../../dashboards/types'
import type { DashboardAction } from './dashboardReducer'

interface ResizeSession {
  id: string; pointerId: number; x: number; y: number; width: number; initial: PlotDimensions; started: boolean; side: ResizeSide
}

/** Preview locally while dragging; commit one draft change on release, or discard on Escape. */
export function useDashboardResize(container: RefObject<HTMLDivElement | null>, onAction: (action: DashboardAction) => void) {
  const session = useRef<ResizeSession | null>(null)
  const [preview, setPreview] = useState<(PlotDimensions & { id: string }) | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const instructionsId = useId()
  const cancel = () => { session.current = null; setPreview(null) }
  useEffect(() => {
    window.addEventListener('blur', cancel)
    return () => window.removeEventListener('blur', cancel)
  }, [])

  const initialSize = (widget: DashboardWidget, handle: HTMLButtonElement) => {
    const width = container.current?.getBoundingClientRect().width ?? 1000
    const surface = handle.closest('article')?.querySelector<HTMLElement>('[data-chart-surface]')
    return { width, initial: { columns: widget.columns ?? (widget.size === 'full' ? 12 : 6), plotHeight: widget.plotHeight ?? surface?.getBoundingClientRect().height ?? 360 } }
  }
  const commit = (id: string, dimensions: PlotDimensions) => {
    onAction({ type: 'resize-widget', id, dimensions })
    setAnnouncement(`Plot resized to ${dimensions.columns} of 12 columns and ${dimensions.plotHeight} pixels high. Layout rearranged.`)
  }
  return {
    preview, instructionsId, announcement,
    handleProps(widget: DashboardWidget, side: ResizeSide) {
      // Keep the same corner throughout a drag, even if packing moves the plot.
      const activeSide = session.current?.id === widget.id ? session.current.side : side
      return {
        'data-resize-side': activeSide,
        title: `Drag to resize plot (${activeSide} to widen)`,
        'aria-label': `Resize ${widget.title || 'plot'}`,
        'aria-describedby': instructionsId,
        onPointerDown(event: PointerEvent<HTMLButtonElement>) {
          if (event.button !== 0 || !event.isPrimary) return
          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.focus({ preventScroll: true })
          event.currentTarget.setPointerCapture(event.pointerId)
          session.current = { id: widget.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
            ...initialSize(widget, event.currentTarget), started: false, side: activeSide }
        },
        onPointerMove(event: PointerEvent<HTMLButtonElement>) {
          const current = session.current
          if (!current || event.pointerId !== current.pointerId) return
          const dx = event.clientX - current.x
          const dy = event.clientY - current.y
          if (!current.started && Math.hypot(dx, dy) < 4) return
          current.started = true
          const dimensions = resizePlot(current.initial, dx, dy, current.width, current.side)
          setPreview(previous => previous?.columns === dimensions.columns && previous.plotHeight === dimensions.plotHeight
            ? previous : { id: widget.id, ...dimensions })
        },
        onPointerUp(event: PointerEvent<HTMLButtonElement>) {
          const current = session.current
          if (!current || event.pointerId !== current.pointerId) return
          if (current.started) commit(current.id, resizePlot(current.initial, event.clientX - current.x, event.clientY - current.y, current.width, current.side))
          cancel()
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        },
        onPointerCancel: cancel,
        onLostPointerCapture: cancel,
        onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
          if (event.key === 'Escape' && session.current) {
            event.preventDefault(); event.stopPropagation(); cancel(); setAnnouncement('Resize cancelled.'); return
          }
          if (event.key === 'Tab' && session.current) { cancel(); return }
          if (session.current || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
          event.preventDefault()
          const { initial, width } = initialSize(widget, event.currentTarget)
          const step = event.shiftKey ? 4 : 1
          const dx = (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0) * (width + DASHBOARD_GAP) / 12 * step
          const dy = (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0) * 20 * step
          commit(widget.id, resizePlot(initial, dx, dy, width, activeSide))
        },
      }
    },
  }
}
