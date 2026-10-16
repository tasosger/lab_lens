import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'
import { closestSortableTarget, type SortableTarget } from '../src/components/sortableTarget.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { packDashboard, widgetColumns } from '../src/dashboards/packing.ts'
import { createDashboardDraft, dashboardIsDirty, dashboardReducer, type DashboardAction } from '../src/features/dashboards/dashboardReducer.ts'

const bounds = { left: 100, top: 100, right: 1120, bottom: 1340 }
const cards: SortableTarget[] = [
  { id: 'top-left', bounds: { left: 100, top: 100, right: 600, bottom: 600 } },
  { id: 'top-right', bounds: { left: 620, top: 100, right: 1120, bottom: 900 } },
  { id: 'bottom-left', bounds: { left: 100, top: 620, right: 600, bottom: 1320 } },
]

describe('grid drop targets', () => {
  it('accepts the top-left plot and surrounding gutters when moving a lower plot', () => {
    assert.equal(closestSortableTarget(120, 120, bounds, cards), 'top-left')
    assert.equal(closestSortableTarget(610, 120, bounds, cards), 'top-left')
    assert.equal(closestSortableTarget(120, 610, bounds, cards), 'top-left')
    assert.equal(closestSortableTarget(610, 120, bounds, [...cards].reverse()), 'top-left')
  })

  it('uses real card extents for uneven heights and includes empty grid areas', () => {
    assert.equal(closestSortableTarget(900, 850, bounds, cards), 'top-right')
    assert.equal(closestSortableTarget(120, 800, bounds, cards), 'bottom-left')
    assert.equal(closestSortableTarget(1100, 950, bounds, cards), 'top-right')
  })

  it('rejects drops outside the grid or without plots', () => {
    for (const [x, y] of [[99, 120], [1121, 120], [120, 99], [120, 1341]]) {
      assert.equal(closestSortableTarget(x!, y!, bounds, cards), null)
    }
    assert.equal(closestSortableTarget(120, 120, bounds, []), null)
  })
})

let server: ViteDevServer
before(async () => { server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' }) })
after(async () => { await server?.close() })

it('commits a pointer drop in the top gutter and packs the lower plot into the top-left corner', async () => {
  const { useSortableGrid } = await server.ssrLoadModule('/src/components/useSortableGrid.ts')
  const original = createDefaultDashboard(getExperimentRepository().getProperties(), '2026-10-15T16:00:00.000Z')
  const dashboard = { ...original, widgets: cards.map((card, i) => ({ ...original.widgets[i % 2]!, id: card.id })) }
  const actions: DashboardAction[] = []
  // Capture the hook's pointer handlers without a browser; geometry is supplied by measured-card doubles.
  let sortable: ReturnType<typeof useSortableGrid>
  function Harness() {
    sortable = useSortableGrid(dashboard.widgets, (id: string, targetId: string) => actions.push({ type: 'reorder-widget', id, targetId }), { includeGaps: true })
    return null
  }
  renderToStaticMarkup(createElement(Harness))
  sortable!.container.current = {
    getBoundingClientRect: () => bounds,
    querySelectorAll: () => cards.map(card => ({ dataset: { sortableId: card.id }, getBoundingClientRect: () => card.bounds })),
  }
  let captured = false
  const button = { focus() {}, setPointerCapture() { captured = true }, hasPointerCapture: () => captured,
    releasePointerCapture() { captured = false } }
  const event = (x: number, y: number) => ({ button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y,
    currentTarget: button, preventDefault() {} })
  const handle = sortable!.handleProps('bottom-left')
  handle.onPointerDown(event(120, 640))
  handle.onPointerMove(event(610, 120))
  assert.deepEqual(actions, [])
  handle.onPointerUp(event(610, 120))
  assert.deepEqual(actions, [{ type: 'reorder-widget', id: 'bottom-left', targetId: 'top-left' }])
  assert.equal(captured, false)
  const moved = dashboardReducer(createDashboardDraft(dashboard), actions[0]!).dashboard
  const packed = packDashboard(moved.widgets.map(widget => ({ id: widget.id, columns: widgetColumns(widget, 1020), rows: 80 })))
  assert.deepEqual(packed[0], { id: 'bottom-left', column: 0, row: 0, columns: 6, rows: 80 })
  assert.equal(dashboardIsDirty(moved, [dashboard]), true)
  assert.deepEqual(moved.widgets[0], dashboard.widgets[2])

  for (const [x, y] of [[120, 800], [99, 120]]) {
    handle.onPointerDown(event(120, 640))
    handle.onPointerMove(event(x!, y!))
    handle.onPointerUp(event(x!, y!))
  }
  assert.equal(actions.length, 1, 'self drops and drops outside the dashboard must not reorder')
})
