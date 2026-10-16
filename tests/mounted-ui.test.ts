import assert from 'node:assert/strict'
import { after, afterEach, before, describe, it } from 'node:test'
import { createServer, type ViteDevServer } from 'vite'
import { act, createElement, useReducer } from 'react'
import { createDomHarness } from './helpers/dom.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import type { ExperimentList, ExperimentRepository } from '../src/data/types.ts'
import { createWorkspaceState, workspaceReducer, type WorkspaceAction } from '../src/features/experiments/workspaceReducer.ts'
import { createChartConfiguration, reduceChartConfiguration } from '../src/chart-model/configuration.ts'
import { createDashboardWidget, createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { createDashboardDraft, dashboardReducer, type DashboardAction } from '../src/features/dashboards/dashboardReducer.ts'
import { experimentFixture } from './fixtures.ts'

let dom: Awaited<ReturnType<typeof createDomHarness>>
let server: ViteDevServer
const repository = createExperimentRepository(experimentFixture())
const properties = repository.getProperties()
const noop = () => {}

before(async () => {
  dom = await createDomHarness()
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' })
})
afterEach(async () => { await dom.reset() })
after(async () => { await dom?.close(); await server?.close() })

function element<T extends Element = HTMLElement>(selector: string): T {
  const result = dom.container.querySelector<T>(selector)
  assert.ok(result, `Missing element: ${selector}`)
  return result
}

describe('mounted workspace and chart behavior', () => {
  it('reuses query results for unrelated actions and invalidates them for query and repository changes', async () => {
    const { useWorkspaceData } = await server.ssrLoadModule('/src/features/experiments/useWorkspaceData.ts')
    let calls = 0
    const counted = { ...repository, list: query => { calls++; return repository.list(query) } } satisfies ExperimentRepository
    let dispatch: (action: WorkspaceAction) => void
    let data: { results: ExperimentList; hiddenSelectionCount: number }
    function Harness({ repo }: { repo: ExperimentRepository }) {
      const [state, send] = useReducer(workspaceReducer, properties, createWorkspaceState)
      dispatch = send
      data = useWorkspaceData(repo, state)
      return createElement('output', null, data.results.matched)
    }
    await dom.render(createElement(Harness, { repo: counted }))
    const initial = data!.results
    const initialCalls = calls
    for (const action of [
      { type: 'toggle-selection', id: 'EXP_A' }, { type: 'open-experiment', id: 'EXP_A' },
      { type: 'chart-type', chartType: 'histogram' }, { type: 'view', view: 'charts' },
      { type: 'toggle-column', propertyId: 'inputs:Additive' },
    ] satisfies WorkspaceAction[]) await act(async () => dispatch(action))
    assert.equal(calls, initialCalls)
    assert.strictEqual(data!.results, initial)
    await act(async () => dispatch({ type: 'search', value: 'EXP_C' }))
    assert.equal(calls, initialCalls + 1)
    assert.deepEqual(data!.results.items.map(item => item.id), ['EXP_C'])
    assert.equal(data!.hiddenSelectionCount, 1)
    await act(async () => dispatch({ type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'gt', value: 50 } }))
    assert.equal(data!.results.matched, 0)
    assert.equal(calls, initialCalls + 2)
    await act(async () => dispatch({ type: 'reset-query' }))
    assert.equal(data!.results.matched, 5)
    await dom.render(createElement(Harness, { repo: createExperimentRepository({ ONLY: { inputs: {}, outputs: {} } }) }))
    assert.deepEqual(data!.results.items.map(item => item.id), ['ONLY'])
  })

  it('restores toolbar focus, updates columns and sorting, and keeps table selection', async () => {
    const { ExperimentWorkspace } = await server.ssrLoadModule('/src/features/experiments/ExperimentWorkspace.tsx')
    await dom.render(createElement(ExperimentWorkspace, { repository }))
    const filter = element<HTMLButtonElement>('button[aria-label="Filters"]')
    await dom.click(filter)
    assert.equal(filter.getAttribute('aria-expanded'), 'true')
    await dom.key(element('#filter-panel'), 'Escape')
    assert.equal(dom.window.document.activeElement, filter)
    assert.equal(dom.container.querySelector('#filter-panel'), null)
    await dom.click(element('input[aria-label="Select EXP_A"]'))
    await dom.click(element('button[aria-label="Sort by Strength ascending"]'))
    assert.equal(element('.experiment-table tbody .experiment-link').textContent?.trim(), 'EXP_E')
    assert.ok(element<HTMLInputElement>('input[aria-label="Select EXP_A"]').checked)
    const columns = element<HTMLButtonElement>('button[aria-controls="column-chooser"]')
    await dom.click(columns)
    const strength = [...dom.container.querySelectorAll<HTMLLabelElement>('#column-chooser label')].find(label => label.textContent?.trim() === 'Strength')!
    await dom.click(strength.querySelector('input')!)
    assert.equal(dom.container.querySelector('button[aria-label="Sort by Strength descending"]'), null)
    assert.equal(element('.experiment-table tbody .experiment-link').textContent?.trim(), 'EXP_A')
    await dom.key(element('#column-chooser'), 'Escape')
    assert.equal(dom.window.document.activeElement, columns)
  })

  it('switches chart types, navigates heatmap cells, and inspects a pair without losing settings', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const experiments = repository.list().items
    function Harness() {
      const [configuration, onChartAction] = useReducer(reduceChartConfiguration, properties, createChartConfiguration)
      return createElement(ExperimentChartView, { configuration, onChartAction, properties, experiments,
        matchingIds: experiments.map(item => item.id), selectedIds: [], isFiltered: false, onOpen: noop, onResetQuery: noop })
    }
    await dom.render(createElement(Harness))
    async function choose(type: string) {
      const select = element<HTMLSelectElement>('.chart-type-select select')
      await act(async () => { select.value = type; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
    }
    await choose('heatmap')
    const cells = dom.container.querySelectorAll<HTMLButtonElement>('.correlation-cell')
    assert.ok(cells.length > 1)
    await act(async () => cells[0].focus())
    await dom.key(cells[0], 'ArrowRight')
    assert.equal(dom.window.document.activeElement, cells[1])
    assert.equal(dom.container.querySelectorAll('.correlation-cell[tabindex="0"]').length, 1)
    await dom.click(cells[1])
    assert.equal(element<HTMLSelectElement>('.chart-type-select select').value, 'scatterplot')
    assert.ok(dom.container.querySelector('.scatter-point'))
    await choose('heatmap')
    assert.equal(dom.container.querySelectorAll('.correlation-cell').length, cells.length)
    await choose('histogram')
    assert.ok(dom.container.querySelector('.histogram-view'))
  })
})

describe('mounted dashboard rendering and gestures', () => {
  it('skips chart work for layout/title updates but responds to configuration, selection, and height', async () => {
    const { DashboardWidget } = await server.ssrLoadModule('/src/features/dashboards/DashboardWidget.tsx')
    let queries = 0
    let chartRenders = 0
    const counted = { ...repository, list: query => { queries++; return repository.list(query) },
      getProperties: () => { chartRenders++; return properties } } satisfies ExperimentRepository
    const widget = createDashboardWidget('one', properties)
    const props = { widget, repository: counted, selectedIds: [], onAction: noop, onOpen: noop,
      dragHandleProps: {}, resizeHandleProps: {}, dragging: false, resizing: false }
    await dom.render(createElement(DashboardWidget, props))
    const before = chartRenders
    await dom.render(createElement(DashboardWidget, { ...props, widget: { ...widget, title: 'Renamed' },
      layoutStyle: { gridColumn: '2 / span 6' }, dragging: true, resizing: true }))
    assert.equal(chartRenders, before)
    assert.equal(queries, 1)
    await dom.render(createElement(DashboardWidget, { ...props, selectedIds: ['EXP_A'] }))
    assert.ok(dom.container.querySelector('.scatter-point-selected'))
    assert.equal(chartRenders, before + 1)
    await dom.render(createElement(DashboardWidget, { ...props, widget: { ...widget, plotHeight: 500 } }))
    assert.equal(element('svg[data-chart-surface]').getAttribute('viewBox')?.split(' ')[3], '500')
    await dom.render(createElement(DashboardWidget, { ...props, widget: { ...widget, configuration: { ...widget.configuration, chartType: 'histogram' } } }))
    assert.ok(dom.container.querySelector('.histogram-view'))
    assert.equal(queries, 1)
  })

  it('commits reordering only on release, preserves charts during preview, and cancels resize on Escape', async () => {
    const { DashboardCanvas } = await server.ssrLoadModule('/src/features/dashboards/DashboardCanvas.tsx')
    const initial = createDefaultDashboard(properties, '2026-10-15T00:00:00.000Z')
    const actions: DashboardAction[] = []
    let queries = 0
    const counted = { ...repository, list: query => { queries++; return repository.list(query) } } satisfies ExperimentRepository
    function Harness() {
      const [draft, send] = useReducer(dashboardReducer, initial, createDashboardDraft)
      return createElement(DashboardCanvas, { dashboard: draft.dashboard, repository: counted, selectedIds: [],
        onAction: (action: DashboardAction) => { actions.push(action); send(action) }, onOpen: noop, onAddPlot: noop })
    }
    await dom.render(createElement(Harness))
    const cards = [...dom.container.querySelectorAll<HTMLElement>('article')]
    const rect = (x: number, y: number, width: number, height: number) => new dom.window.DOMRect(x, y, width, height)
    element('.dashboard-grid').getBoundingClientRect = () => rect(0, 0, 1000, 600)
    cards[0].getBoundingClientRect = () => rect(0, 0, 490, 550)
    cards[1].getBoundingClientRect = () => rect(510, 0, 490, 550)
    const move = cards[0].querySelector<HTMLButtonElement>('.dashboard-drag-handle')!
    const before = queries
    await dom.pointer(move, 'pointerdown', 20, 200)
    await dom.pointer(move, 'pointermove', 700, 200)
    assert.ok(dom.container.querySelector('.dashboard-drag-preview'))
    assert.equal(actions.length, 0)
    assert.equal(queries, before)
    await dom.pointer(move, 'pointerup', 700, 200)
    assert.equal(actions.length, 1)
    assert.equal(actions[0].type, 'reorder-widget')
    assert.equal(element('article').dataset.sortableId, initial.widgets[1].id)
    const resize = element<HTMLButtonElement>('.dashboard-resize-handle')
    await dom.pointer(resize, 'pointerdown', 490, 500)
    await dom.pointer(resize, 'pointermove', 650, 560)
    assert.ok(dom.container.querySelector('[data-resizing="true"]'))
    await dom.key(resize, 'Escape')
    await dom.pointer(resize, 'pointerup', 650, 560)
    assert.equal(actions.length, 1)
    assert.equal(dom.container.querySelector('[data-resizing="true"]'), null)
    await dom.key(resize, 'ArrowDown')
    assert.equal(actions[1].type, 'resize-widget')
  })
})
