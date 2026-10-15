export const DEFAULT_DRAWER_WIDTH = 520

export function drawerWidthBounds(viewportWidth: number) {
  const max = Math.max(0, viewportWidth - 24)
  return { min: Math.min(380, max), max }
}

export function clampDrawerWidth(width: number, viewportWidth: number): number {
  const { min, max } = drawerWidthBounds(viewportWidth)
  return Math.min(max, Math.max(min, Math.round(width)))
}

/** The drawer is anchored on the right, so dragging left increases its width. */
export function draggedDrawerWidth(startWidth: number, startX: number, currentX: number, viewportWidth: number): number {
  return clampDrawerWidth(startWidth + startX - currentX, viewportWidth)
}

export function keyboardDrawerWidth(width: number, key: string, viewportWidth: number, shift = false): number | undefined {
  const { min, max } = drawerWidthBounds(viewportWidth)
  const step = shift ? 50 : 10
  switch (key) {
    case 'ArrowLeft': return clampDrawerWidth(width + step, viewportWidth)
    case 'ArrowRight': return clampDrawerWidth(width - step, viewportWidth)
    case 'Home': return min
    case 'End': return max
    default: return undefined
  }
}
