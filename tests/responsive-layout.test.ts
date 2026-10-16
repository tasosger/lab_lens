import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fitChartLabel, heatmapLayout, parallelLayout } from '../src/charts/responsiveLayout.ts'

describe('container-sized dense chart layouts', () => {
  it('fits every heatmap cell within the width and a bounded plot height', () => {
    for (const width of [240, 320, 480, 800, 1400]) {
      for (const columns of [1, 2, 12, 24, 48]) {
        for (const rows of [1, 2, 24, 64]) {
          const layout = heatmapLayout(width, columns, rows)
          const usedWidth = width * layout.rowLabelPercent / 100 + columns * layout.cellWidth + layout.gap * (columns + 2)
          const usedHeight = rows * layout.cellHeight + layout.gap * (rows + 1)
          assert.ok(usedWidth <= width + 1e-8, `${columns} columns overflow ${width}px`)
          assert.ok(usedHeight <= 480 + 1e-8, `${rows} rows exceed the height budget`)
          assert.ok(layout.cellWidth > 0 && layout.cellHeight > 0)
          assert.ok(layout.rowLabelStride * layout.cellHeight >= 16)
          assert.ok(layout.columnLabelStride * layout.cellWidth >= 14)
        }
      }
    }
  })

  it('restores readable values and sample counts when more space becomes available', () => {
    const dense = heatmapLayout(320, 24, 24)
    assert.equal(dense.showValues, false)
    assert.equal(dense.showCounts, false)
    assert.equal(dense.rotateHeaders, true)
    const roomy = heatmapLayout(1200, 4, 4)
    assert.equal(roomy.showValues, true)
    assert.equal(roomy.showCounts, true)
    assert.equal(roomy.rotateHeaders, false)
  })

  it('keeps all parallel axes and their labels inside narrow and wide plots', () => {
    for (const width of [240, 320, 480, 800, 1400]) {
      for (const axes of [2, 6, 12, 24, 48]) {
        const layout = parallelLayout(width, axes)
        assert.ok(layout.top < layout.bottom && layout.bottom < layout.height)
        for (let index = 0; index < axes; index++) {
          assert.ok(layout.x(index) > 0 && layout.x(index) < width)
          if (index > 0) assert.ok(layout.x(index) > layout.x(index - 1))
          if (layout.rotateLabels) {
            assert.ok(layout.labelY(index) - layout.labelWidth >= 0)
            assert.ok(layout.labelY(index) < layout.top)
          } else {
            assert.ok(layout.x(index) - layout.labelWidth / 2 >= 0)
            assert.ok(layout.x(index) + layout.labelWidth / 2 <= width)
          }
          for (let previous = 0; previous < index; previous++) {
            if (layout.rotateLabels && layout.labelY(previous) === layout.labelY(index)) {
              assert.ok(layout.x(index) - layout.x(previous) >= 14)
            }
          }
        }
        assert.ok(layout.tickLabelStride * layout.spacing >= 64)
      }
    }
  })

  it('shortens only labels that exceed the available space', () => {
    assert.equal(fitChartLabel('Strength', 100), 'Strength')
    assert.equal(fitChartLabel('Long property name', 42), 'Long …')
    assert.equal(fitChartLabel('Strength', 1), '…')
  })
})
