import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'
import { createExperimentRepository } from '../src/data/repository.ts'
import { createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { decodeDashboardStore } from '../src/dashboards/validation.ts'

const repository = createExperimentRepository({
  A: { inputs: { Amount: 1, Legacy: 0 }, outputs: { Strength: 2 } },
  B: { inputs: { Amount: 2 }, outputs: { Strength: 3 } },
  C: { inputs: { Amount: 0, Legacy: 8 }, outputs: { Strength: 4 } },
  D: { inputs: { Amount: 3, Legacy: 9 }, outputs: {} },
})
const properties = repository.getProperties()
const experiments = repository.list().items
const source = createDefaultDashboard(properties, '2026-10-15T12:00:00.000Z')
const widget = source.widgets[0]!
const legacy = { ...widget,
  plotFilter: { xPropertyId: 'inputs:Amount', yPropertyId: 'outputs:Strength', range: { x: [0, 1], y: [0, 2] } },
  configuration: { ...widget.configuration, chartType: 'scatterplot', chartMode: '3d',
  chartAxes: { x: 'inputs:Amount', y: 'outputs:Strength' }, chartZ: 'inputs:Legacy', hideZeroInputs: true } }
const saved = decodeDashboardStore(JSON.stringify({ version: 1, dashboards: [{ ...source, widgets: [legacy] }] }), properties).dashboards[0]!.widgets[0]!
const noop = () => {}
let server: ViteDevServer
before(async () => { server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' }) })
after(async () => { await server?.close() })

function assertTwoDimensional(html: string) {
  assert.doesNotMatch(html, /Select range|Enter numeric bounds|Edit plot range|Clear plot range|chart-brush|scatter-point-excluded|Outside plot range|shown for context/)
  assert.doesNotMatch(html, /3D scatterplot|orbit-chart|Z axis|Add value|Remove Z|Drag to rotate|Shift-drag|Swap X and Z|Swap Y and Z/)
  assert.equal((html.match(/class="scatter-point(?: scatter-point-selected)?"/g) ?? []).length, 2)
  assert.match(html, /2 plotted/)
  assert.match(html, /1 omitted: missing an axis value/)
  assert.match(html, /1 excluded/)
  assert.match(html, /A\. Selected\. Amount: 1\. Strength: 2\. Open details/)
  assert.match(html, /B\. Amount: 2\. Strength: 3\. Open details/)
  assert.doesNotMatch(html, /<th[^>]*>Legacy|<dt>Z/)
}

describe('two-dimensional scatterplot visuals', () => {
  it('shows only X/Y controls and retains complete pairs with zero or missing legacy Z values', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    for (const chartMode of ['2d', '3d']) {
      const html = renderToStaticMarkup(createElement(ExperimentChartView, {
        properties, experiments, matchingIds: experiments.map(item => item.id), selectedIds: ['A'],
        configuration: { ...saved.configuration, chartMode },
        isFiltered: false, onChartAction: noop, onOpen: noop, onResetQuery: noop,
      }))
      assertTwoDimensional(html)
      assert.match(html, /X axis/)
      assert.match(html, /Y axis/)
      assert.match(html, /Swap X and Y axes/)
    }
  })

  it('opens legacy dashboard charts in 2D without applying saved ranges, while viewing and editing', async () => {
    const { DashboardWidget } = await server.ssrLoadModule('/src/features/dashboards/DashboardWidget.tsx')
    for (const initiallyEditing of [false, true]) {
      const html = renderToStaticMarkup(createElement(DashboardWidget, {
        widget: saved, repository, selectedIds: ['A'], initiallyEditing, dragHandleProps: {}, dragging: false,
        resizeHandleProps: {}, resizing: false, onAction: noop, onOpen: noop,
      }))
      assertTwoDimensional(html)
    }
    assert.equal(saved.configuration.chartMode, '3d')
    assert.equal(saved.configuration.chartZ, 'inputs:Legacy')
  })

  it('renders only matching experiments and shows an empty state when filters match none', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const props = { properties, experiments, selectedIds: ['A'], configuration: saved.configuration,
      isFiltered: true, onChartAction: noop, onOpen: noop, onResetQuery: noop }
    const html = renderToStaticMarkup(createElement(ExperimentChartView, { ...props, matchingIds: ['B'] }))
    assert.match(html, /1 plotted/)
    assert.match(html, /B\. Amount: 2\. Strength: 3\. Open details/)
    assert.doesNotMatch(html, /A\. Selected\.|scatter-point-excluded|omitted: missing an axis value/)
    const empty = renderToStaticMarkup(createElement(ExperimentChartView, { ...props, matchingIds: [] }))
    assert.match(empty, /No matching experiments/)
    assert.match(empty, /Reset search and filters/)
    assert.doesNotMatch(empty, /class="scatter-point|No complete pairs to plot/)
  })
})
