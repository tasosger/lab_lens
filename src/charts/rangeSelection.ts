import type { CartesianLayout, CartesianRange, ChartPosition, ChartRectangle } from './types.ts'

export function isCartesianRange(range: CartesianRange): boolean {
  return [range.x, range.y].every(([min, max]) => Number.isFinite(min) && Number.isFinite(max) && min <= max)
}

export function clampToPlot(point: ChartPosition, plot: ChartRectangle): ChartPosition {
  return {
    x: Math.max(plot.left, Math.min(plot.right, point.x)),
    y: Math.max(plot.top, Math.min(plot.bottom, point.y)),
  }
}

export function selectionRectangle(start: ChartPosition, end: ChartPosition): ChartRectangle {
  return {
    left: Math.min(start.x, end.x), right: Math.max(start.x, end.x),
    top: Math.min(start.y, end.y), bottom: Math.max(start.y, end.y),
  }
}

/** Ignore clicks and nearly one-dimensional gestures, in SVG pixels. */
export function isRangeDrag(rectangle: ChartRectangle, minimum = 4): boolean {
  return rectangle.right - rectangle.left >= minimum && rectangle.bottom - rectangle.top >= minimum
}

export function rectangleToRange(rectangle: ChartRectangle, layout: CartesianLayout): CartesianRange {
  return {
    x: [layout.xScale.invert(rectangle.left), layout.xScale.invert(rectangle.right)],
    y: [layout.yScale.invert(rectangle.bottom), layout.yScale.invert(rectangle.top)],
  }
}

export function rangeToRectangle(range: CartesianRange, layout: CartesianLayout): ChartRectangle | null {
  const rectangle = {
    left: Math.max(layout.left, layout.xScale(range.x[0])),
    right: Math.min(layout.right, layout.xScale(range.x[1])),
    top: Math.max(layout.top, layout.yScale(range.y[1])),
    bottom: Math.min(layout.bottom, layout.yScale(range.y[0])),
  }
  return rectangle.left <= rectangle.right && rectangle.top <= rectangle.bottom ? rectangle : null
}
