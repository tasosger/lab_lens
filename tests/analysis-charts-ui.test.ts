import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createServer, type ViteDevServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createExperimentRepository } from '../src/data/repository.ts'
import { createChartConfiguration } from '../src/features/charts/chartConfiguration.ts'
import { experimentFixture } from './fixtures.ts'

const repository = createExperimentRepository(experimentFixture())
const properties = repository.getProperties()
const experiments = repository.list().items
const configuration = { ...createChartConfiguration(properties), pieProperty: 'inputs:Additive',
  heatmapX: ['outputs:Strength'], heatmapY: ['inputs:Additive'], parallelProperties: ['inputs:Additive', 'outputs:Strength'] }
const noop = () => {}
const common = { id: 'test-analysis', configuration, experiments, matchingIds: experiments.map(item => item.id), properties, selectedIds: ['EXP_C'],
  rangeSelection: null, hasPlotFilter: false, isFiltered: false, onChartAction: noop, onPlotFilter: noop, onOpen: noop, onResetQuery: noop }
let server: ViteDevServer
before(async () => { server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' }) })
after(async () => { await server?.close() })

describe('analysis chart rendering and controls', () => {
  it('renders all three types with standalone controls and hides controls in saved dashboard mode', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    for (const [chartType, label, mark] of [['pie', 'Pie chart', /class="pie-slice"/], ['heatmap', 'Correlation heatmap', /class="correlation-cell"/],
      ['parallel', 'Parallel coordinates', /class="parallel-line/]] as const) {
      const props = { ...common, configuration: { ...configuration, chartType } }
      const html = renderToStaticMarkup(createElement(ExperimentChartView, props))
      assert.ok(html.includes(`aria-label="${label}"`))
      assert.match(html, mark)
      assert.match(html, /chart-controls/)
      assert.doesNotMatch(html, /NaN|Infinity/)
      const hidden = renderToStaticMarkup(createElement(ExperimentChartView, { ...props, showControls: false }))
      assert.doesNotMatch(hidden, /chart-controls|<select|type="checkbox"/)
      assert.match(hidden, mark)
    }
  })

  it('shows exact-value pie counts, percentages, selected counts, and missing-value reporting', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const html = renderToStaticMarkup(createElement(ExperimentChartView, { ...common, configuration: { ...configuration, chartType: 'pie', pieGrouping: 'values' } }))
    assert.equal((html.match(/class="pie-slice"/g) ?? []).length, 3)
    assert.match(html, /4 experiments/)
    assert.match(html, /1 omitted: missing values/)
    assert.match(html, /0: 2 experiments, 50.0 percent/)
    assert.match(html, /<td>2<\/td><td>50.0%<\/td><td>1<\/td>/)
  })

  it('renders sample counts, unavailable correlations and independently selectable axes', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const props = { ...common, configuration: { ...configuration, chartType: 'heatmap' } }
    const html = renderToStaticMarkup(createElement(ExperimentChartView, props))
    assert.match(html, /X axis · columns/)
    assert.match(html, /Y axis · rows/)
    assert.match(html, /-0.87/)
    assert.match(html, /n = 3/)
    assert.match(html, /Open scatterplot/)
    const tooFew = renderToStaticMarkup(createElement(ExperimentChartView, { ...props, matchingIds: ['EXP_A', 'EXP_B'] }))
    assert.match(tooFew, /<strong>N\/A<\/strong>/)
    assert.match(tooFew, /n = 2/)
    assert.match(tooFew, /At least 3 paired values are required/)
  })

  it('provides a keyboard-accessible line and data table for each complete experiment', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const html = renderToStaticMarkup(createElement(ExperimentChartView, { ...common, configuration: { ...configuration, chartType: 'parallel' } }))
    assert.equal((html.match(/class="parallel-line(?: is-selected)?"/g) ?? []).length, 3)
    assert.equal((html.match(/role="button" tabindex="0"/g) ?? []).length, 3)
    assert.match(html, /2 omitted: missing values/)
    assert.match(html, /EXP_C, selected/)
    assert.match(html, /View experiment values \(3\)/)
    assert.match(html, /Move Additive later/)
    assert.doesNotMatch(html, /EXP_D|EXP_E/)
  })

  it('explains empty results and incomplete axis choices without rendering misleading plots', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    for (const chartType of ['pie', 'heatmap', 'parallel']) {
      const empty = renderToStaticMarkup(createElement(ExperimentChartView, { ...common, matchingIds: [], isFiltered: true,
        configuration: { ...configuration, chartType } }))
      assert.match(empty, /No matching experiments/)
      assert.match(empty, /Reset search and filters/)
      assert.doesNotMatch(empty, /class="pie-slice"|class="correlation-cell"|class="parallel-line/)
    }
    const noAxis = renderToStaticMarkup(createElement(ExperimentChartView, { ...common, configuration: { ...configuration, chartType: 'heatmap', heatmapX: [] } }))
    assert.match(noAxis, /Choose properties for both axes/)
    const oneAxis = renderToStaticMarkup(createElement(ExperimentChartView, { ...common, configuration: { ...configuration, chartType: 'parallel', parallelProperties: ['inputs:Additive'] } }))
    assert.match(oneAxis, /Choose at least two properties/)
  })
})
