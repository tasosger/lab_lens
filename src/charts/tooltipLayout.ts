/** Tall content flows below the plot; floating content stays inside all four edges. */
export function tooltipLayout(width: number, height: number, x: number, y: number, contentHeight: number) {
  const inset = Math.min(8, Math.max(0, width / 4))
  const tooltipWidth = Math.max(1, Math.min(240, width - inset * 2))
  const inFlow = contentHeight > height - inset * 2
  return {
    width: tooltipWidth,
    inFlow,
    left: Math.max(inset, Math.min(x + 14, width - tooltipWidth - inset)),
    top: Math.max(inset, Math.min(y - 100, height - contentHeight - inset)),
    inset,
  }
}
