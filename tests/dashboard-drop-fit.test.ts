import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fitPlotToSlot, packDashboard, widgetColumns } from '../src/dashboards/packing.ts'
import { createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { createDashboardRepository } from '../src/dashboards/repository.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { createDashboardDraft, dashboardIsDirty, dashboardReducer } from '../src/features/dashboards/dashboardReducer.ts'

const properties = getExperimentRepository().getProperties()
const original = createDefaultDashboard(properties, '2026-10-15T16:00:00.000Z')
const source = { ...original.widgets[0]!, id: 'large', columns: 12, plotHeight: 700 }
const dashboard = { ...original, widgets: [...original.widgets, source] }

describe('fitting dragged dashboard plots', () => {
  it('shrinks excess width and height without enlarging plots that already fit', () => {
    assert.deepEqual(fitPlotToSlot(source, { columns: 6, plotHeight: 360 }), { columns: 6, plotHeight: 360 })
    assert.deepEqual(fitPlotToSlot({ columns: 8, plotHeight: 320 }, { columns: 6, plotHeight: 400 }), { columns: 6, plotHeight: 320 })
    assert.deepEqual(fitPlotToSlot({ columns: 4, plotHeight: 700 }, { columns: 6, plotHeight: 375 }), { plotHeight: 360 })
    assert.deepEqual(fitPlotToSlot({ columns: 4, plotHeight: 300 }, { columns: 6, plotHeight: 360 }), {})
    assert.deepEqual(fitPlotToSlot({ columns: 6, plotHeight: 375 }, { columns: 6, plotHeight: 375 }), {})
    assert.deepEqual(fitPlotToSlot(source, { columns: 4, plotHeight: 100 }), { columns: 4, plotHeight: 240 })
  })

  it('moves a full-width lower plot into either top column with the fitted size in one saved draft edit', () => {
    for (const targetId of original.widgets.map(widget => widget.id)) {
      const fit = fitPlotToSlot(source, { columns: 6, plotHeight: 360 })
      const moved = dashboardReducer(createDashboardDraft(dashboard), { type: 'reorder-widget', id: source.id, targetId, fit }).dashboard
      const columns = moved.widgets.map(widget => ({ id: widget.id, columns: widgetColumns(widget, 1000), rows: 60 }))
      const placed = packDashboard(columns).find(item => item.id === source.id)!
      assert.equal(placed.row, 0)
      assert.equal(placed.column, targetId === original.widgets[0]!.id ? 0 : 6)
      const fitted = moved.widgets.find(widget => widget.id === source.id)!
      assert.equal(fitted.columns, 6)
      assert.equal(fitted.plotHeight, 360)
      assert.equal(fitted.size, 'half')
      assert.equal(fitted.configuration, source.configuration)
      for (const widget of original.widgets) assert.equal(moved.widgets.find(item => item.id === widget.id), widget)
      assert.equal(dashboardIsDirty(moved, [dashboard]), true)
      let raw: string | null = null
      const storage = { read: () => raw, write: (value: string) => { raw = value } }
      const saved = createDashboardRepository(storage, properties).save(moved)
      assert.deepEqual(createDashboardRepository(storage, properties).list().find(item => item.id === saved.id), saved)
    }
  })

  it('preserves dimensions omitted from the fit and saved desktop widths on narrow screens', () => {
    const targetId = original.widgets[1]!.id
    const autoHeight = { ...original.widgets[0]!, columns: 12 }
    const current = { ...original, widgets: [autoHeight, original.widgets[1]!] }
    const widthOnly = dashboardReducer(createDashboardDraft(current), { type: 'reorder-widget', id: autoHeight.id, targetId, fit: { columns: 6 } }).dashboard
    assert.equal(widthOnly.widgets[1]!.plotHeight, undefined)
    const narrow = { ...autoHeight, columns: 4 }
    const fit = fitPlotToSlot({ columns: widgetColumns(narrow, 320), plotHeight: 360 },
      { columns: widgetColumns(original.widgets[1]!, 320), plotHeight: 360 })
    assert.deepEqual(fit, {})
    const mobile = dashboardReducer(createDashboardDraft({ ...current, widgets: [narrow, original.widgets[1]!] }),
      { type: 'reorder-widget', id: narrow.id, targetId, fit }).dashboard
    assert.equal(mobile.widgets[1]!.columns, 4)
  })

  it('does not resize self drops, missing targets, or invalid destinations', () => {
    const draft = createDashboardDraft(dashboard)
    for (const targetId of [source.id, 'missing']) {
      assert.equal(dashboardReducer(draft, { type: 'reorder-widget', id: source.id, targetId, fit: { columns: 6 } }), draft)
    }
    for (const fit of [{ columns: 3 }, { columns: 6.5 }, { plotHeight: 0 }, { plotHeight: Infinity }]) {
      assert.equal(dashboardReducer(draft, { type: 'reorder-widget', id: source.id, targetId: original.widgets[0]!.id, fit }), draft)
    }
  })
})
