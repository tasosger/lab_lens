import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'
import { DASHBOARD_GAP, DASHBOARD_ROW_HEIGHT, fitPlotToSlot, packDashboard, resizeSide, widgetColumns, type PlotDimensions } from '../../dashboards/packing'
import type { DashboardWidget } from '../../dashboards/types'

/** Measure natural card heights; explicit grid positions then fill gaps without clipping content. */
export function usePackedDashboard(container: RefObject<HTMLDivElement | null>, items: readonly Pick<DashboardWidget, 'id' | 'size' | 'columns' | 'plotHeight'>[]) {
  const [measurements, setMeasurements] = useState<{ width: number; heights: Record<string, number>; plotHeights: Record<string, number | undefined> }>({ width: 1000, heights: {}, plotHeights: {} })
  const dimensions = JSON.stringify(items.map(({ id, size, columns, plotHeight }) => [id, size, columns, plotHeight]))
  useLayoutEffect(() => {
    const grid = container.current
    if (!grid) return
    const cards = [...grid.querySelectorAll<HTMLElement>(':scope > [data-layout-id]')]
    const measure = () => {
      const width = Math.round(grid.getBoundingClientRect().width)
      if (!width) return
      const heights = Object.fromEntries(cards.map(card => [card.dataset.layoutId!, Math.ceil(card.getBoundingClientRect().height)]))
      const plotHeights = Object.fromEntries(cards.map(card => [card.dataset.layoutId!, card.querySelector<HTMLElement>('[data-chart-surface]')?.getBoundingClientRect().height]))
      setMeasurements(previous => previous.width === width && JSON.stringify(previous.heights) === JSON.stringify(heights)
        && JSON.stringify(previous.plotHeights) === JSON.stringify(plotHeights) ? previous : { width, heights, plotHeights })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    cards.forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [container, dimensions])

  const positions = new Map(packDashboard(items.map(item => ({
    id: item.id, columns: widgetColumns(item, measurements.width),
    rows: Math.ceil(((measurements.heights[item.id] ?? 600) + DASHBOARD_GAP) / DASHBOARD_ROW_HEIGHT),
  }))).map(position => [position.id, position]))
  return {
    fitFor(id: string, targetId: string): Partial<PlotDimensions> {
      const source = items.find(item => item.id === id)
      const target = items.find(item => item.id === targetId)
      if (!source || !target || id === targetId) return {}
      const size = (item: typeof source): PlotDimensions => ({ columns: widgetColumns(item, measurements.width),
        plotHeight: measurements.plotHeights[item.id] ?? item.plotHeight ?? 360 })
      return fitPlotToSlot(size(source), size(target))
    },
    resizeSideFor(id: string) { return resizeSide(positions.get(id)!) },
    styleFor(id: string): CSSProperties {
      const position = positions.get(id)!
      return { gridColumn: `${position.column + 1} / span ${position.columns}`, gridRow: `${position.row + 1} / span ${position.rows}` }
    },
  }
}
