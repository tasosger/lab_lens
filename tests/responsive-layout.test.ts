import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fitChartLabel, heatmapLayout, parallelLayout } from '../src/charts/responsiveLayout.ts'

describe('container-sized dense chart layouts', () => {
  it('uses dashboard height overrides without changing the axes or cell count', () => {
    for (const height of [240, 520, 900]) {
      const heatmap = heatmapLayout(800, 24, 24, height)
      assert.equal(heatmap.viewportHeight, height)
      assert.ok(heatmap.cellHeight >= 28)
      assert.ok(heatmap.contentHeight >= height - 1e-8)
      const parallel = parallelLayout(800, 24, height)
      assert.equal(parallel.height, height)
      assert.ok(parallel.bottom > parallel.top)
    }
  })
  it('keeps every heatmap cell selectable inside bounded scrolling viewports', () => {
    for (const width of [240, 320, 480, 800, 1400]) {
      for (const columns of [1, 2, 12, 24, 48, 200]) {
        for (const rows of [1, 2, 24, 64, 200]) {
          const layout = heatmapLayout(width, columns, rows)
          const usedWidth = layout.contentWidth * layout.rowLabelPercent / 100 + columns * layout.cellWidth + layout.gap * (columns + 2)
          assert.ok(Math.abs(usedWidth - layout.contentWidth) < 1e-8)
          assert.ok(layout.viewportHeight <= 592, `${rows} rows exceed the viewport height budget`)
          assert.ok(layout.cellWidth >= 28 - 1e-8 && layout.cellHeight >= 28)
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

  it('preserves emoji and combining sequences and accounts for wide glyphs', () => {
    assert.equal(fitChartLabel('🧪 measurement', 14), '…')
    assert.equal(fitChartLabel('🧪 measurement', 21), '🧪…')
    assert.equal(fitChartLabel('e\u0301xy', 14), 'e\u0301…')
    assert.equal(fitChartLabel('👩‍🔬xyz', 21), '👩‍🔬…')
    assert.equal(fitChartLabel('測定値', 28), '測…')
    assert.equal(fitChartLabel('WWWW', 28), 'WW…')
  })
})
