export interface SortableBounds { left: number; top: number; right: number; bottom: number }
export interface SortableTarget { id: string; bounds: SortableBounds }

/** Include gaps in a grid's drop area, while rejecting drops outside the grid. */
export function closestSortableTarget(x: number, y: number, bounds: SortableBounds, items: readonly SortableTarget[]): string | null {
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null
  let target: SortableTarget | undefined
  let distance = Infinity
  for (const item of items) {
    const dx = Math.max(item.bounds.left - x, 0, x - item.bounds.right)
    const dy = Math.max(item.bounds.top - y, 0, y - item.bounds.bottom)
    const next = dx * dx + dy * dy
    // Resolve equal distances in visual reading order, regardless of DOM order.
    if (next < distance || (next === distance && target && (item.bounds.top < target.bounds.top
      || (item.bounds.top === target.bounds.top && item.bounds.left < target.bounds.left)))) {
      target = item
      distance = next
    }
  }
  return target?.id ?? null
}
