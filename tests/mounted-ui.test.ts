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

async function enterValue(selector: string, value: string) {
  const input = element<HTMLInputElement | HTMLSelectElement>(selector)
  await act(async () => {
    const prototype = input.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new dom.window.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
  })
}

describe('reusable chart renderers', () => {
  it('renders supplied dimension labels and reports identifiers without experiment property definitions', async () => {
    const { CorrelationHeatmapPlot } = await server.ssrLoadModule('/src/charts/CorrelationHeatmapPlot.tsx')
    const cost = { id: 'cost', label: 'Cost', groupLabel: 'Economics' }
    const yieldAxis = { id: 'yield', label: 'Yield', groupLabel: 'Production' }
    const inspected: string[][] = []
    await dom.render(createElement(CorrelationHeatmapPlot, {
      columns: [cost], matrix: [{ property: yieldAxis, cells: [{ x: cost, y: yieldAxis, value: 0.5, count: 3, unavailable: null }] }],
      onInspect: (x: string, y: string) => inspected.push([x, y]),
    }))
    const cell = element<HTMLButtonElement>('.correlation-cell')
    assert.match(cell.getAttribute('aria-label')!, /Yield \(Production\) versus Cost \(Economics\)/)
    assert.equal(cell.tabIndex, 0)
    await dom.click(cell)
    assert.deepEqual(inspected, [['cost', 'yield']])

    const { ParallelCoordinatesPlot } = await server.ssrLoadModule('/src/charts/ParallelCoordinatesPlot.tsx')
    const opened: string[] = []
    await dom.render(createElement(ParallelCoordinatesPlot, {
      dimensions: [cost, yieldAxis].map(axis => ({ ...axis, domain: [0, 10] })),
      lines: [{ id: 'sample-1', label: 'Sample 1', values: [2, 8] }], selectedIds: [],
      onOpen: (id: string) => opened.push(id),
    }))
    assert.deepEqual([...dom.container.querySelectorAll('.parallel-axis-group')].map(label => label.textContent), ['Economics', 'Production'])
    await dom.key(element('.parallel-line'), 'Enter')
    assert.deepEqual(opened, ['sample-1'])
  })
})

describe('mounted filter flow', () => {
  it('adds from search, previews the complete query, and edits in place without applying canceled changes', async () => {
    const { ExperimentWorkspace } = await server.ssrLoadModule('/src/features/experiments/ExperimentWorkspace.tsx')
    await dom.render(createElement(ExperimentWorkspace, { repository }))
    const rows = () => [...dom.container.querySelectorAll('.experiment-table tbody .experiment-link')].map(link => link.textContent?.trim())
    await dom.click(element('button[aria-label="Filters"]'))
    assert.equal(dom.window.document.activeElement, element('.filter-property-search input'))
    assert.equal(dom.container.querySelector('.filter-composer input[type="number"]'), null)
    await enterValue('.filter-property-search input', 'stren')
    assert.equal(dom.container.querySelectorAll('.filter-property-options button').length, 1)
    await dom.key(element('.filter-property-search input'), 'Enter')
    assert.equal(dom.window.document.activeElement, element('.filter-thresholds input'))
    assert.equal(element<HTMLSelectElement>('.filter-value-type select').value, 'absolute')
    await enterValue('.filter-thresholds input', '10')
    assert.match(element('.filter-composer-footer').textContent!, /2 of 5 experiments after saving/)
    assert.equal(rows().length, 5)
    await dom.click(element('.filter-composer button[type="submit"]'))
    assert.deepEqual(rows(), ['EXP_B', 'EXP_C'])
    assert.equal(dom.container.querySelector('.filter-composer'), null)

    await dom.click(element('.filter-rule-actions > button'))
    await dom.click(element('[data-property-id="inputs:Additive"]'))
    await enterValue('.filter-thresholds input', '1')
    assert.match(element('.filter-composer-footer').textContent!, /1 of 5 experiments after saving/)
    assert.deepEqual(rows(), ['EXP_B', 'EXP_C'])
    await enterValue('input[aria-label="Search experiments"]', 'EXP_C')
    assert.match(element('.filter-composer-footer').textContent!, /0 of 5 experiments after saving/)
    await dom.key(element('.filter-thresholds input'), 'Escape')
    assert.deepEqual(rows(), ['EXP_C'])
    assert.equal(dom.container.querySelectorAll('.filter-rule-edit').length, 1)
    await enterValue('input[aria-label="Search experiments"]', '')

    await dom.click(element('.filter-rule-edit'))
    assert.equal(dom.container.querySelector('.filter-rule-edit'), null, 'editing replaces the original row')
    assert.equal(element<HTMLInputElement>('.filter-thresholds input').value, '10')
    await enterValue('.filter-thresholds input', '2')
    assert.match(element('.filter-composer-footer').textContent!, /3 of 5 experiments after saving/)
    await dom.key(element('.filter-thresholds input'), 'Escape')
    assert.deepEqual(rows(), ['EXP_B', 'EXP_C'])
    await dom.click(element('.filter-rule-edit'))
    assert.equal(element<HTMLInputElement>('.filter-thresholds input').value, '10')
    await enterValue('.filter-thresholds input', '2')
    await dom.click(element('.filter-composer button[type="submit"]'))
    assert.deepEqual(rows(), ['EXP_A', 'EXP_B', 'EXP_C'])
  })

  it('keeps range values when switching units, explains percentile cutoffs, and rejects invalid bounds', async () => {
    const { ExperimentWorkspace } = await server.ssrLoadModule('/src/features/experiments/ExperimentWorkspace.tsx')
    await dom.render(createElement(ExperimentWorkspace, { repository }))
    await dom.click(element('button[aria-label="Filters"]'))
    await dom.click(element('[data-property-id="outputs:Strength"]'))
    await enterValue('.filter-composer-fields > label select', 'between')
    await enterValue('.filter-thresholds label:first-child input', '25')
    await enterValue('.filter-thresholds label:last-child input', '75')
    await enterValue('.filter-value-type select', 'percentile')
    assert.equal(element<HTMLInputElement>('.filter-thresholds label:first-child input').value, '25')
    assert.equal(element<HTMLInputElement>('.filter-thresholds label:last-child input').value, '75')
    assert.equal(element('.filter-value-hint').textContent, 'P25–P75 = 1 to 10')
    await enterValue('.filter-thresholds label:last-child input', '101')
    assert.ok(element<HTMLButtonElement>('.filter-composer button[type="submit"]').disabled)
    assert.match(element('[role="alert"]').textContent!, /between 0 and 100/)
    await enterValue('.filter-thresholds label:last-child input', '75')
    await dom.click(element('.filter-composer button[type="submit"]'))
    assert.equal(dom.container.querySelectorAll('.experiment-table tbody .experiment-link').length, 3)
    assert.match(element('.filter-rule-edit').textContent!, /Strength between P25 and P75/)
  })
})

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
