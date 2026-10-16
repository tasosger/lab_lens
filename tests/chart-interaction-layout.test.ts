import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nextGridCell } from '../src/charts/gridNavigation.ts'
import { tooltipLayout } from '../src/charts/tooltipLayout.ts'

describe('matrix keyboard navigation', () => {
  it('navigates both dimensions and bounds every edge without trapping Tab', () => {
    assert.deepEqual(nextGridCell({ row: 1, column: 1 }, 'ArrowRight', 3, 4), { row: 1, column: 2 })
    assert.deepEqual(nextGridCell({ row: 1, column: 1 }, 'ArrowDown', 3, 4), { row: 2, column: 1 })
    assert.deepEqual(nextGridCell({ row: 0, column: 0 }, 'ArrowLeft', 3, 4), { row: 0, column: 0 })
    assert.deepEqual(nextGridCell({ row: 0, column: 0 }, 'ArrowUp', 3, 4), { row: 0, column: 0 })
    assert.deepEqual(nextGridCell({ row: 2, column: 3 }, 'ArrowRight', 3, 4), { row: 2, column: 3 })
    assert.deepEqual(nextGridCell({ row: 2, column: 3 }, 'ArrowDown', 3, 4), { row: 2, column: 3 })
    assert.equal(nextGridCell({ row: 0, column: 0 }, 'Tab', 3, 4), null)
    assert.equal(nextGridCell({ row: 0, column: 0 }, 'Enter', 3, 4), null)
    assert.equal(nextGridCell({ row: 0, column: 0 }, 'ArrowDown', 0, 0), null)
  })
  it('supports row and matrix Home/End shortcuts', () => {
    assert.deepEqual(nextGridCell({ row: 1, column: 2 }, 'Home', 3, 4), { row: 1, column: 0 })
    assert.deepEqual(nextGridCell({ row: 1, column: 2 }, 'End', 3, 4), { row: 1, column: 3 })
    assert.deepEqual(nextGridCell({ row: 1, column: 2 }, 'Home', 3, 4, true), { row: 0, column: 0 })
    assert.deepEqual(nextGridCell({ row: 1, column: 2 }, 'End', 3, 4, true), { row: 2, column: 3 })
  })
})

describe('tooltip containment', () => {
  it('contains floating tooltips at every corner, including narrow containers', () => {
    for (const width of [80, 200, 240, 320, 800]) {
      for (const x of [-1000, 0, width, 1000]) {
        for (const y of [-1000, 0, 240, 1000]) {
          const layout = tooltipLayout(width, 240, x, y, 150)
          assert.equal(layout.inFlow, false)
          assert.ok(layout.left >= 0 && layout.left + layout.width <= width)
          assert.ok(layout.top >= 0 && layout.top + 150 <= 240)
        }
      }
    }
  })
  it('places content taller than the plot into document flow without truncating it', () => {
    assert.equal(tooltipLayout(240, 240, 200, 200, 400).inFlow, true)
    assert.equal(tooltipLayout(240, 600, 200, 200, 400).inFlow, false)
  })
})
