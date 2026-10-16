import type { DashboardWidget } from './types.ts'

export const DASHBOARD_COLUMNS = 12
export const DASHBOARD_GAP = 20
export const DASHBOARD_ROW_HEIGHT = 8
export const MIN_PLOT_HEIGHT = 240
export const MAX_PLOT_HEIGHT = 900

export interface PlotDimensions { columns: number; plotHeight: number }
export interface PackedItem { id: string; columns: number; rows: number }
export interface Placement extends PackedItem { column: number; row: number }
export type ResizeSide = 'left' | 'right'

export function resizeSide(position: Pick<Placement, 'column' | 'columns'>): ResizeSide {
  return position.column > 0 && position.column + position.columns / 2 > DASHBOARD_COLUMNS / 2 ? 'left' : 'right'
}

export function minimumColumns(width: number) { return width >= 940 ? 4 : width >= 600 ? 6 : 12 }
export function widgetColumns(widget: Pick<DashboardWidget, 'size' | 'columns'>, width: number) {
  return Math.max(minimumColumns(width), widget.columns ?? (widget.size === 'full' ? 12 : 6))
}

export function resizePlot(start: PlotDimensions, dx: number, dy: number, containerWidth: number, side: ResizeSide = 'right'): PlotDimensions {
  const columnStep = (containerWidth + DASHBOARD_GAP) / DASHBOARD_COLUMNS
  const widthDelta = side === 'left' ? -dx : dx
  const visibleColumns = Math.max(minimumColumns(containerWidth), start.columns)
  const resizedColumns = Math.min(12, Math.max(minimumColumns(containerWidth), Math.round(visibleColumns + widthDelta / columnStep)))
  return {
    // Responsive expansion is temporary, including when only height changes.
    columns: resizedColumns === visibleColumns ? start.columns : resizedColumns,
    plotHeight: Math.min(MAX_PLOT_HEIGHT, Math.max(MIN_PLOT_HEIGHT, Math.round((start.plotHeight + dy) / 20) * 20)),
  }
}

export function isPlotDimensions(value: PlotDimensions) {
  return Number.isInteger(value.columns) && value.columns >= 4 && value.columns <= 12
    && Number.isFinite(value.plotHeight) && value.plotHeight >= MIN_PLOT_HEIGHT && value.plotHeight <= MAX_PLOT_HEIGHT
}

/** Shrink to the destination without enlarging a plot that already fits. */
export function fitPlotToSlot(current: PlotDimensions, slot: PlotDimensions): Partial<PlotDimensions> {
  const fit: Partial<PlotDimensions> = {}
  const columns = Math.max(4, Math.min(DASHBOARD_COLUMNS, Math.floor(slot.columns)))
  const plotHeight = Math.max(MIN_PLOT_HEIGHT, Math.min(MAX_PLOT_HEIGHT, Math.floor(slot.plotHeight / 20) * 20))
  if (current.columns > columns) fit.columns = columns
  if (current.plotHeight > slot.plotHeight + 1 && current.plotHeight > plotHeight) fit.plotHeight = plotHeight
  // A narrower heatmap can grow taller when its labels rotate. Keep the fitted height stable.
  if (fit.columns !== undefined && fit.plotHeight === undefined && current.plotHeight >= MIN_PLOT_HEIGHT) {
    fit.plotHeight = Math.min(MAX_PLOT_HEIGHT, current.plotHeight)
  }
  return fit
}

/** First available gap, in reading order. Later items can fill holes left by larger plots. */
export function packDashboard(items: readonly PackedItem[]): Placement[] {
  const placed: Placement[] = []
  for (const item of items) {
    const rows = Math.max(1, Math.ceil(item.rows))
    const columns = Math.min(DASHBOARD_COLUMNS, Math.max(1, Math.ceil(item.columns)))
    const candidates = [...new Set([0, ...placed.map(other => other.row + other.rows)])].sort((a, b) => a - b)
    let position: Placement | undefined
    for (const row of candidates) {
      for (let column = 0; column <= DASHBOARD_COLUMNS - columns; column++) {
        const overlaps = placed.some(other => column < other.column + other.columns && column + columns > other.column
          && row < other.row + other.rows && row + rows > other.row)
        if (!overlaps) { position = { id: item.id, columns, rows, column, row }; break }
      }
      if (position) break
    }
    placed.push(position!)
  }
  return placed
}
