import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createServer, type ViteDevServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getExperimentRepository } from '../src/data/index.ts'
import { createDashboard, createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { createDashboardDraft } from '../src/features/dashboards/dashboardReducer.ts'

const repository = getExperimentRepository()
const dashboard = createDefaultDashboard(repository.getProperties(), '2026-10-15T16:00:00.000Z')
const draft = createDashboardDraft(dashboard)
const noop = () => {}
let server: ViteDevServer

before(async () => { server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' }) })
after(async () => { await server?.close() })

describe('dashboard UI boundaries', () => {
  it('keeps the sidebar list in its existing order with a simple Add button', async () => {
    const { DashboardList } = await server.ssrLoadModule('/src/features/dashboards/DashboardList.tsx')
    const dashboards = [createDashboard('z', 'Zebra', dashboard.createdAt), createDashboard('a', 'Alpha', dashboard.createdAt)]
    const html = renderToStaticMarkup(createElement(DashboardList, { drafts: dashboards.map(createDashboardDraft), saved: dashboards,
      activeId: 'z', renamingId: null, error: '', onSelect: noop, onCreate: noop, onDelete: () => true,
      onRename: noop, onNameChange: noop, onFinishRename: noop }))
    assert.ok(html.indexOf('Zebra') < html.indexOf('Alpha'))
    assert.match(html, /aria-label="Add dashboard"[^>]*>\+ Add<\/button>/)
    assert.doesNotMatch(html, /<select|Sort by|New dashboard|Saved in this browser|Duplicate/)
    assert.match(html, /aria-label="Delete Zebra"/)
    assert.match(html, /aria-label="Rename Zebra"/)
    const renaming = renderToStaticMarkup(createElement(DashboardList, { drafts: dashboards.map(createDashboardDraft), saved: dashboards,
      activeId: 'z', renamingId: 'z', error: '', onSelect: noop, onCreate: noop, onDelete: () => true,
      onRename: noop, onNameChange: noop, onFinishRename: noop }))
    assert.match(renaming, /<input[^>]*aria-label="Dashboard name"[^>]*value="Zebra"/)
    assert.doesNotMatch(renaming, /aria-label="Rename Zebra"/)
  })

  it('renders a template dropdown and drag handles without navigation, global filters or plot settings', async () => {
    const { DashboardEditor } = await server.ssrLoadModule('/src/features/dashboards/DashboardEditor.tsx')
    const props = { draft, dirty: false, repository, selectedIds: [], onAction: noop, onSave: noop, onOpen: noop }
    const html = renderToStaticMarkup(createElement(DashboardEditor, props))
    assert.equal((html.match(/<article /g) ?? []).length, 2)
    assert.equal((html.match(/class="dashboard-drag-handle"/g) ?? []).length, 2)
    assert.equal((html.match(/class="button dashboard-edit-button"/g) ?? []).length, 2)
    assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 2)
    assert.match(html, /Template<select/)
    for (const label of ['Two columns', 'Stacked', 'Featured plot']) assert.ok(html.includes(label))
    assert.match(html, /disabled="">Save dashboard/)
    for (const removed of ['Duplicate', 'Earlier', 'Later', 'New dashboard', 'Delete dashboard', 'Search dashboard', 'Clear all filters',
      'dashboard-filter-panel', 'chart-controls', 'Plot title', 'Plot width', 'Saved in this browser', 'Dashboard name', 'Name your dashboard', 'dashboard-editor-heading']) assert.ok(!html.includes(removed), removed)
    assert.match(html, /this plot&#x27;s results/)
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1])
    assert.equal(new Set(ids).size, ids.length)
    const dirty = renderToStaticMarkup(createElement(DashboardEditor, { ...props, dirty: true }))
    assert.match(dirty, /Unsaved changes/)
    assert.doesNotMatch(dirty, /disabled="">Save dashboard/)
  })

  it('hides controls for every dashboard chart type while keeping standalone chart controls available', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const experiments = repository.list().items
    const props = { id: 'test-chart', experiments, matchingIds: experiments.map(item => item.id), selectedIds: [], properties: repository.getProperties(),
      rangeSelection: null, hasPlotFilter: false, isFiltered: false, onChartAction: noop, onPlotFilter: noop, onOpen: noop, onResetQuery: noop }
    for (const chartType of ['scatterplot', 'histogram']) {
      const configuration = { ...dashboard.widgets[0]!.configuration, chartType }
      const hidden = renderToStaticMarkup(createElement(ExperimentChartView, { ...props, configuration, showControls: false }))
      assert.doesNotMatch(hidden, /chart-controls|<select/)
      const editable = renderToStaticMarkup(createElement(ExperimentChartView, { ...props, configuration, showControls: true }))
      assert.match(editable, /chart-controls/)
      assert.match(editable, /Chart type/)
      assert.match(editable, chartType === 'histogram' ? /Bins/ : /X axis/)
      const standalone = renderToStaticMarkup(createElement(ExperimentChartView, { ...props, configuration }))
      assert.match(standalone, /chart-controls/)
    }
  })

  it('directs an empty workspace to the sidebar without an in-view creation button', async () => {
    const { DashboardWorkspace } = await server.ssrLoadModule('/src/features/dashboards/DashboardWorkspace.tsx')
    const html = renderToStaticMarkup(createElement(DashboardWorkspace, { active: true, library: { ready: true, error: '', active: undefined }, repository,
      selectedIds: [], onOpen: noop }))
    assert.match(html, /sidebar/)
    assert.doesNotMatch(html, /<button|<select/)
  })
})
