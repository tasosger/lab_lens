/** Fit dense charts to their container without changing the selected data. */
export function heatmapLayout(width: number, columnCount: number, rowCount: number) {
  const columns = Math.max(1, columnCount)
  const rows = Math.max(1, rowCount)
  const rowLabelWidth = Math.min(144, width * 0.3)
  const gap = width / columns < 40 || rows > 16 ? 1 : 3
  const cellWidth = Math.max(1, (width - rowLabelWidth - gap * (columns + 2)) / columns)
  const cellHeight = Math.max(1, Math.min(64, Math.max(24, cellWidth * 0.65), (480 - gap * (rows + 1)) / rows))
  return {
    rowLabelPercent: rowLabelWidth / Math.max(1, width) * 100,
    gap, cellWidth, cellHeight,
    rotateHeaders: cellWidth < 100,
    columnLabelStride: Math.max(1, Math.ceil(14 / cellWidth)),
    rowLabelStride: Math.max(1, Math.ceil(16 / cellHeight)),
    showValues: cellWidth >= 38 && cellHeight >= 18,
    showCounts: cellWidth >= 56 && cellHeight >= 44,
    showRowGroups: cellHeight >= 40,
  }
}

export function parallelLayout(width: number, dimensionCount: number) {
  const margin = Math.min(80, width * 0.2)
  const spacing = (width - margin * 2) / Math.max(1, dimensionCount - 1)
  const rotateLabels = spacing < 100
  // Alternate vertical label bands when even rotated names would overlap.
  const labelLanes = Math.max(1, Math.ceil(14 / Math.max(1, spacing)))
  const height = Math.min(440, Math.max(360, Math.round(width * 0.55)))
  return {
    width, height, spacing, rotateLabels,
    top: rotateLabels ? 146 : 80,
    bottom: height - 30,
    labelWidth: rotateLabels ? 122 / labelLanes - 4 : Math.min(spacing - 12, margin * 2 - 8),
    labelY: (index: number) => rotateLabels ? 132 - index % labelLanes * (122 / labelLanes) : 28,
    tickLabelStride: Math.max(1, Math.ceil(64 / Math.max(1, spacing))),
    x: (index: number) => margin + index * spacing,
  }
}

export function fitChartLabel(label: string, availableWidth: number, characterWidth = 7) {
  const length = Math.max(1, Math.floor(availableWidth / characterWidth))
  return label.length <= length ? label : `${label.slice(0, length - 1)}…`
}
