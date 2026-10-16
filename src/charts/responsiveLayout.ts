/** Keep dense matrices usable; the viewport scrolls instead of shrinking targets. */
export function heatmapLayout(width: number, columnCount: number, rowCount: number, preferredHeight?: number) {
  const columns = Math.max(1, columnCount)
  const rows = Math.max(1, rowCount)
  const rowLabelWidth = Math.min(144, width * 0.3)
  const gap = width / columns < 40 || rows > 16 ? 1 : 3
  const contentWidth = Math.max(width, rowLabelWidth + 28 * columns + gap * (columns + 2))
  const cellWidth = (contentWidth - rowLabelWidth - gap * (columns + 2)) / columns
  const headerHeight = cellWidth < 100 ? 112 : 64
  const bodyHeight = preferredHeight === undefined ? 480 : Math.max(40, preferredHeight - headerHeight)
  // Table spacing includes the header row as well as the body rows.
  const availableCellHeight = (bodyHeight - gap * (rows + 2)) / rows
  const cellHeight = Math.max(28, preferredHeight === undefined
    ? Math.min(64, Math.max(28, cellWidth * 0.65), availableCellHeight) : availableCellHeight)
  const contentHeight = headerHeight + rows * cellHeight + gap * (rows + 2)
  return {
    rowLabelPercent: rowLabelWidth / Math.max(1, contentWidth) * 100,
    gap, cellWidth, cellHeight, contentWidth, contentHeight,
    viewportHeight: preferredHeight ?? Math.min(contentHeight, headerHeight + 480),
    rotateHeaders: cellWidth < 100,
    columnLabelStride: Math.max(1, Math.ceil(14 / cellWidth)),
    rowLabelStride: Math.max(1, Math.ceil(16 / cellHeight)),
    showValues: cellWidth >= 38 && cellHeight >= 18,
    showCounts: cellWidth >= 56 && cellHeight >= 44,
    showRowGroups: cellHeight >= 40,
  }
}

export function parallelLayout(width: number, dimensionCount: number, preferredHeight?: number) {
  const margin = Math.min(80, width * 0.2)
  const spacing = (width - margin * 2) / Math.max(1, dimensionCount - 1)
  const rotateLabels = spacing < 100
  // Alternate vertical label bands when even rotated names would overlap.
  const labelLanes = Math.max(1, Math.ceil(14 / Math.max(1, spacing)))
  const height = preferredHeight ?? Math.min(440, Math.max(360, Math.round(width * 0.55)))
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

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' })

/** Estimate conservatively without cutting an emoji or combining-character sequence. */
export function fitChartLabel(label: string, availableWidth: number, characterWidth = 7) {
  const parts = Array.from(graphemes.segment(label), part => part.segment)
  const widths = parts.map(part => /[\p{Extended_Pictographic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(part)
    ? characterWidth * 2 : /[MW@%]/.test(part) ? characterWidth * 1.5 : characterWidth)
  if (widths.reduce((sum, width) => sum + width, 0) <= availableWidth) return label
  let used = characterWidth
  let end = 0
  while (end < parts.length && used + widths[end]! <= availableWidth) used += widths[end++]!
  return `${parts.slice(0, end).join('')}…`
}
