import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createServer, type ViteDevServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createExperimentRepository } from '../src/data/repository.ts'
import { createChartConfiguration } from '../src/features/charts/chartConfiguration.ts'
import { experimentFixture } from './fixtures.ts'

const repo = createExperimentRepository(experimentFixture())
const experiments = repo.list().items
const properties = repo.getProperties()
const noop = () => {}
const common = { id: 'zero-chart', experiments, properties, matchingIds: experiments.map(item => item.id), selectedIds: [],
  rangeSelection: null, hasPlotFilter: false, isFiltered: false, onChartAction: noop, onPlotFilter: noop, onOpen: noop, onResetQuery: noop }
const configuration = { ...createChartConfiguration(properties), pieProperty: 'inputs:Additive', pieGrouping: 'values',
  histogramProperty: 'inputs:Additive', chartAxes: { x: 'inputs:Additive', y: 'outputs:Strength' },
  heatmapX: ['outputs:Strength'], heatmapY: ['inputs:Additive'], parallelProperties: ['inputs:Additive', 'outputs:Strength'] }
let server: ViteDevServer
before(async () => { server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' }) })
after(async () => { await server?.close() })

describe('discreet chart zero filter', () => {
  it('offers one checkbox on every chart using ingredients, even outside dashboard edit mode', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    for (const chartType of ['scatterplot', 'histogram', 'pie', 'heatmap', 'parallel']) {
      const html = renderToStaticMarkup(createElement(ExperimentChartView, { ...common, showControls: false,
        configuration: { ...configuration, chartType } }))
      assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1)
      assert.match(html, /Exclude zero inputs/)
      assert.doesNotMatch(html, /checked=""|Present inputs|chart-controls/)
    }
  })

  it('removes the zero pie slice, recalculates percentages, and reports the excluded count', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const props = { ...common, configuration: { ...configuration, chartType: 'pie', hideZeroInputs: true } }
    const html = renderToStaticMarkup(createElement(ExperimentChartView, props))
    assert.match(html, /checked=""/)
    assert.match(html, /2 excluded/)
    assert.equal((html.match(/class="pie-slice"/g) ?? []).length, 2)
    assert.match(html, /1: 1 experiments, 50.0 percent/)
    assert.match(html, /2: 1 experiments, 50.0 percent/)
    assert.doesNotMatch(html, /aria-label="0:/)
    assert.match(html, /1 omitted: missing values/)
    const off = renderToStaticMarkup(createElement(ExperimentChartView, { ...props,
      configuration: { ...props.configuration, hideZeroInputs: false } }))
    assert.equal((off.match(/class="pie-slice"/g) ?? []).length, 3)
    assert.match(off, /0: 2 experiments, 50.0 percent/)
  })

  it('updates histogram, scatter, parallel and heatmap counts with the same checkbox', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const render = (chartType: string) => renderToStaticMarkup(createElement(ExperimentChartView, { ...common,
      configuration: { ...configuration, chartType, hideZeroInputs: true } }))
    assert.match(render('histogram'), /2 experiments/)
    assert.match(render('scatterplot'), /2 plotted/)
    assert.match(render('parallel'), /View experiment values \(2\)/)
    const heatmap = render('heatmap')
    assert.match(heatmap, /Per cell/)
    assert.match(heatmap, /n = 2/)
    assert.match(heatmap, /At least 3 paired values are required/)
  })

  it('keeps the toggle available when all values are excluded and hides it for output-only charts', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    const empty = renderToStaticMarkup(createElement(ExperimentChartView, { ...common, experiments: [repo.getById('EXP_C')!],
      matchingIds: ['EXP_C'], configuration: { ...configuration, chartType: 'pie', hideZeroInputs: true } }))
    assert.match(empty, /No matching experiments/)
    assert.match(empty, /Exclude zero inputs/)
    assert.match(empty, /1 excluded/)
    assert.doesNotMatch(empty, /class="pie-slice"/)
    const output = renderToStaticMarkup(createElement(ExperimentChartView, { ...common,
      configuration: { ...configuration, chartType: 'pie', pieProperty: 'outputs:Cure Time', hideZeroInputs: true } }))
    assert.doesNotMatch(output, /Exclude zero inputs/)
    assert.match(output, /0: 1 experiments, 25.0 percent/)
  })
})
