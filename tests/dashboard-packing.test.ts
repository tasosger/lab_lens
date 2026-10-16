import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { packDashboard, resizePlot, resizeSide, widgetColumns, type Placement } from '../src/dashboards/packing.ts'
import { createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { createDashboardRepository } from '../src/dashboards/repository.ts'
import { validateDashboard, DashboardValidationError } from '../src/dashboards/validation.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { createDashboardDraft, dashboardIsDirty, dashboardReducer } from '../src/features/dashboards/dashboardReducer.ts'

const properties = getExperimentRepository().getProperties()
const original = createDefaultDashboard(properties, '2026-10-15T16:00:00.000Z')
const id = original.widgets[0]!.id
const overlaps = (a: Placement, b: Placement) => a.column < b.column + b.columns && a.column + a.columns > b.column
  && a.row < b.row + b.rows && a.row + a.rows > b.row

describe('dashboard packing and resizing', () => {
  it('fills a gap under a short plot even when a wide plot appears earlier in the order', () => {
    const packed = packDashboard([
      { id: 'tall', columns: 6, rows: 10 }, { id: 'short', columns: 6, rows: 4 },
      { id: 'wide', columns: 12, rows: 6 }, { id: 'filler', columns: 6, rows: 6 },
    ])
    assert.deepEqual(packed.map(({ id, column, row }) => [id, column, row]), [
      ['tall', 0, 0], ['short', 6, 0], ['wide', 0, 10], ['filler', 6, 4],
    ])
  })

  it('moves plots to a new row after widening and compacts after shrinking or deletion', () => {
    const items = [{ id: 'a', columns: 6, rows: 8 }, { id: 'b', columns: 6, rows: 8 }, { id: 'c', columns: 6, rows: 8 }]
    assert.equal(packDashboard(items)[1]!.row, 0)
    assert.equal(packDashboard([{ ...items[0]!, columns: 8 }, ...items.slice(1)])[1]!.row, 8)
    assert.equal(packDashboard(items.slice(1))[1]!.row, 0)
    assert.deepEqual(packDashboard(items.map(item => ({ ...item, columns: 4 }))).map(item => item.row), [0, 0, 0])
  })

  it('never overlaps, loses, or pushes mixed sizes beyond the grid and is deterministic', () => {
    const items = Array.from({ length: 60 }, (_, index) => ({ id: String(index), columns: 4 + index * 7 % 9, rows: 15 + index * 17 % 90 }))
    const before = structuredClone(items)
    const placed = packDashboard(items)
    assert.deepEqual(items, before)
    assert.deepEqual(placed, packDashboard(items))
    assert.deepEqual(placed.map(item => item.id), items.map(item => item.id))
    placed.forEach((item, index) => {
      assert.ok(item.column >= 0 && item.column + item.columns <= 12 && item.row >= 0)
      placed.slice(index + 1).forEach(other => assert.equal(overlaps(item, other), false))
      // No earlier location could hold this item when it was placed.
      for (let row = 0; row < item.row; row++) {
        for (let column = 0; column <= 12 - item.columns; column++) {
          assert.ok(placed.slice(0, index).some(other => overlaps({ ...item, row, column }, other)))
        }
      }
    })
    assert.deepEqual(packDashboard([]), [])
  })

  it('snaps drag dimensions, enforces readable minimums, and bounds maximum sizes', () => {
    const start = { columns: 6, plotHeight: 360 }
    assert.deepEqual(resizePlot(start, 100, 45, 1180), { columns: 7, plotHeight: 400 })
    assert.deepEqual(resizePlot(start, -10000, -10000, 1180), { columns: 4, plotHeight: 240 })
    assert.deepEqual(resizePlot(start, 10000, 10000, 1180), { columns: 12, plotHeight: 900 })
    assert.deepEqual(resizePlot(start, -10000, 0, 700), { columns: 6, plotHeight: 360 })
    assert.deepEqual(resizePlot(start, -10000, 0, 320), { columns: 6, plotHeight: 360 })
  })

  it('adapts to narrow screens without overwriting saved sizes', () => {
    const widget = { ...original.widgets[0]!, columns: 4, plotHeight: 500 }
    assert.equal(widgetColumns(widget, 1200), 4)
    assert.equal(widgetColumns(widget, 700), 6)
    assert.equal(widgetColumns(widget, 320), 12)
    assert.equal(widget.columns, 4)
    assert.equal(widgetColumns(original.widgets[0]!, 1200), 6)
    assert.equal(widgetColumns({ ...widget, columns: undefined, size: 'full' }, 1200), 12)
  })

  it('preserves desktop width through vertical resizing, jitter, saving and responsive expansion', () => {
    for (const width of [320, 500, 700, 1200]) {
      const widget = { ...original.widgets[0]!, columns: 4, plotHeight: 360 }
      for (const dx of [0, 2, -2]) {
        const dimensions = resizePlot(widget, dx, 40, width)
        assert.deepEqual(dimensions, { columns: 4, plotHeight: 400 })
        const dashboard = { ...original, widgets: [widget] }
        const resized = dashboardReducer(createDashboardDraft(dashboard), { type: 'resize-widget', id: widget.id, dimensions }).dashboard
        const saved = validateDashboard(resized, properties).widgets[0]!
        assert.equal(widgetColumns(saved, 1200), 4)
        assert.equal(widgetColumns(saved, 320), 12)
      }
    }
    assert.equal(resizePlot({ columns: 4, plotHeight: 360 }, 120, 0, 700).columns, 8)
  })

  it('chooses the resize corner from the packed position, including gaps and full-width plots', () => {
    const packed = packDashboard([
      { id: 'tall', columns: 6, rows: 10 }, { id: 'short', columns: 6, rows: 4 },
      { id: 'wide', columns: 12, rows: 6 }, { id: 'filler', columns: 6, rows: 6 },
    ])
    assert.deepEqual(packed.map(resizeSide), ['right', 'left', 'right', 'left'])
    const thirds = packDashboard(['a', 'b', 'c'].map(id => ({ id, columns: 4, rows: 6 })))
    assert.deepEqual(thirds.map(resizeSide), ['right', 'right', 'left'])
    const stacked = packDashboard(packed.map(item => ({ ...item, columns: 12 })))
    assert.deepEqual(stacked.map(resizeSide), ['right', 'right', 'right', 'right'])
  })

  it('widens left handles when dragging left and keeps height changes and bounds consistent', () => {
    const start = { columns: 6, plotHeight: 360 }
    assert.deepEqual(resizePlot(start, -100, 45, 1180, 'left'), { columns: 7, plotHeight: 400 })
    assert.deepEqual(resizePlot(start, 100, -40, 1180, 'left'), { columns: 5, plotHeight: 320 })
    assert.deepEqual(resizePlot(start, -10000, 10000, 1180, 'left'), { columns: 12, plotHeight: 900 })
    assert.deepEqual(resizePlot(start, 10000, -10000, 1180, 'left'), { columns: 4, plotHeight: 240 })
    assert.deepEqual(resizePlot(start, 0, 60, 1180, 'left'), resizePlot(start, 0, 60, 1180, 'right'))
  })

  it('marks resizing unsaved, retains chart data and filters, and restores dimensions after saving', () => {
    const draft = createDashboardDraft(original)
    const resized = dashboardReducer(draft, { type: 'resize-widget', id, dimensions: { columns: 8, plotHeight: 520 } })
    assert.equal(resized.dashboard.layout, 'custom')
    assert.equal(dashboardIsDirty(resized.dashboard, [original]), true)
    assert.equal(resized.dashboard.widgets[0]!.configuration, original.widgets[0]!.configuration)
    assert.equal(resized.dashboard.widgets[1], original.widgets[1])
    assert.equal(dashboardReducer(resized, { type: 'resize-widget', id, dimensions: { columns: 8, plotHeight: 520 } }), resized)
    let raw: string | null = null
    const repository = createDashboardRepository({ read: () => raw, write: value => { raw = value } }, properties)
    const saved = repository.save(resized.dashboard)
    const loaded = createDashboardRepository({ read: () => raw, write: () => {} }, properties).list().find(item => item.id === saved.id)!
    assert.deepEqual(loaded, saved)
    assert.equal(dashboardIsDirty(loaded, [saved]), false)
    const reset = dashboardReducer(resized, { type: 'reset-widget-size', id })
    assert.deepEqual(reset.dashboard.widgets[0], original.widgets[0])
  })

  it('preserves legacy records, rejects invalid saved dimensions, and ignores invalid resize actions', () => {
    assert.deepEqual(validateDashboard(original, properties), original)
    const draft = createDashboardDraft(original)
    for (const dimensions of [{ columns: 0, plotHeight: 500 }, { columns: 13, plotHeight: 500 }, { columns: 6.5, plotHeight: 500 },
      { columns: 6, plotHeight: 0 }, { columns: 6, plotHeight: Infinity }, { columns: 6, plotHeight: 901 }]) {
      assert.throws(() => validateDashboard({ ...original, widgets: [{ ...original.widgets[0], ...dimensions }] }, properties), DashboardValidationError)
      assert.equal(dashboardReducer(draft, { type: 'resize-widget', id, dimensions }), draft)
    }
    assert.equal(dashboardReducer(draft, { type: 'resize-widget', id: 'missing', dimensions: { columns: 6, plotHeight: 400 } }), draft)
  })

  it('templates reset custom widths while retaining chosen heights and chart settings', () => {
    const resized = dashboardReducer(createDashboardDraft(original), { type: 'resize-widget', id, dimensions: { columns: 8, plotHeight: 520 } })
    const templated = dashboardReducer(resized, { type: 'template', template: 'stack' }).dashboard.widgets[0]!
    assert.equal(templated.columns, undefined)
    assert.equal(templated.size, 'full')
    assert.equal(templated.plotHeight, 520)
    assert.equal(templated.configuration, original.widgets[0]!.configuration)
  })
})
