import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'
import { createExperimentRepository } from '../src/data/repository.ts'
import { createChartConfiguration } from '../src/chart-model/configuration.ts'
import { experimentFixture } from './fixtures.ts'

const repository = createExperimentRepository(experimentFixture())
const properties = repository.getProperties()
const experiments = repository.list().items
const noop = () => {}
let server: ViteDevServer
before(async () => { server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' }) })
after(async () => { await server?.close() })

describe('percentile filter UI', () => {
  it('uses one value-type field and starts with an empty absolute value', async () => {
    const { FilterBuilder } = await server.ssrLoadModule('/src/features/experiments/FilterBuilder.tsx')
    const html = renderToStaticMarkup(createElement(FilterBuilder, { properties, experiments, onApply: noop, onClose: noop }))
    assert.match(html, /Value type<select/)
    assert.equal((html.match(/<option value="absolute"/g) ?? []).length, 1)
    assert.match(html, /<option value="absolute" selected="">Absolute/)
    assert.match(html, /<option value="percentile">Percentile/)
    assert.match(html, /type="number"[^>]*value=""/)
    assert.doesNotMatch(html, /role="alert"|Threshold type|Quick percentile|How percentiles work|filter-presets/)
  })

  it('restores percentile bounds during editing in the same value fields', async () => {
    const { FilterBuilder } = await server.ssrLoadModule('/src/features/experiments/FilterBuilder.tsx')
    const html = renderToStaticMarkup(createElement(FilterBuilder, { properties, experiments, onApply: noop, onClose: noop,
      initialCondition: { propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', min: 25, max: 75 } }))
    assert.match(html, /<option value="percentile" selected="">Percentile/)
    assert.match(html, /From value/)
    assert.match(html, /To value/)
    assert.equal((html.match(/min="0" max="100"/g) ?? []).length, 2)
    assert.match(html, /value="25"/)
    assert.match(html, /value="75"/)
    assert.match(html, /Save changes/)
  })

  it('keeps existing absolute filters in their original units', async () => {
    const { FilterBuilder } = await server.ssrLoadModule('/src/features/experiments/FilterBuilder.tsx')
    const html = renderToStaticMarkup(createElement(FilterBuilder, { properties, experiments, onApply: noop, onClose: noop,
      initialCondition: { propertyId: 'outputs:Strength', operator: 'gte', value: 10 } }))
    assert.match(html, /<option value="absolute" selected="">Absolute/)
    assert.match(html, /value="10"/)
    assert.doesNotMatch(html, /recorded values|min="0" max="100"/)
  })

  it('shows inline errors for invalid percentiles and blocks applying them', async () => {
    const { FilterBuilder } = await server.ssrLoadModule('/src/features/experiments/FilterBuilder.tsx')
    const props = { properties, experiments, onApply: noop, onClose: noop }
    for (const initialCondition of [
      { propertyId: 'outputs:Strength', operator: 'gte', scale: 'percentile', value: -1 },
      { propertyId: 'outputs:Strength', operator: 'gte', scale: 'percentile', value: 101 },
      { propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', min: 25, max: 101 },
    ]) {
      const html = renderToStaticMarkup(createElement(FilterBuilder, { ...props, initialCondition }))
      assert.match(html, /role="alert">Enter percentiles between 0 and 100/)
      assert.match(html, /aria-invalid="true" aria-describedby="[^"]+"/)
      assert.match(html, /disabled="" type="submit"/)
      assert.doesNotMatch(html, /filter-range-warning/)
    }
    for (const value of [0, 12.5, 100]) {
      const html = renderToStaticMarkup(createElement(FilterBuilder, { ...props,
        initialCondition: { propertyId: 'outputs:Strength', operator: 'gte', scale: 'percentile', value } }))
      assert.doesNotMatch(html, /role="alert"|aria-invalid="true"|disabled="" type="submit"/)
    }
  })

  it('warns for completely out-of-range absolute values without disabling submission', async () => {
    const { FilterBuilder } = await server.ssrLoadModule('/src/features/experiments/FilterBuilder.tsx')
    const props = { properties, experiments, onApply: noop, onClose: noop }
    for (const initialCondition of [
      { propertyId: 'outputs:Strength', operator: 'gte', value: 1000 },
      { propertyId: 'outputs:Strength', operator: 'between', min: -10, max: -3 },
    ]) {
      const html = renderToStaticMarkup(createElement(FilterBuilder, { ...props, initialCondition }))
      assert.match(html, /class="filter-range-warning"[^>]*role="status">Warning:/)
      assert.match(html, /outside the recorded range \(-2 to 10\)/)
      assert.doesNotMatch(html, /aria-invalid="true"|disabled="" type="submit"|role="alert"/)
    }
    for (const initialCondition of [
      { propertyId: 'outputs:Strength', operator: 'gte', value: 10 },
      { propertyId: 'outputs:Strength', operator: 'between', min: -10, max: 5 },
      { propertyId: 'outputs:Strength', operator: 'between', min: -10, max: 20 },
    ]) {
      const html = renderToStaticMarkup(createElement(FilterBuilder, { ...props, initialCondition }))
      assert.doesNotMatch(html, /filter-range-warning/)
    }
  })

  it('rejects invalid percentile submission but accepts an absolute value with a warning', async () => {
    const { FilterBuilder } = await server.ssrLoadModule('/src/features/experiments/FilterBuilder.tsx')
    for (const scale of ['percentile', 'absolute']) {
      const initialCondition = { propertyId: 'outputs:Strength', operator: 'gte', scale, value: 101 }
      const applied: unknown[] = []
      let closed = 0
      let form: ReturnType<typeof FilterBuilder>
      function Harness() {
        form = FilterBuilder({ properties, experiments, initialCondition, onApply: (condition: unknown) => applied.push(condition), onClose: () => { closed++ } })
        return form
      }
      renderToStaticMarkup(createElement(Harness))
      form!.props.onSubmit({ preventDefault: noop })
      assert.deepEqual(applied, scale === 'absolute' ? [initialCondition] : [])
      assert.equal(closed, scale === 'absolute' ? 1 : 0)
    }
  })

  it('shows scatterplots without range selection in standalone and dashboard modes', async () => {
    const { ExperimentChartView } = await server.ssrLoadModule('/src/features/charts/ExperimentChartView.tsx')
    for (const showControls of [true, false]) {
      const html = renderToStaticMarkup(createElement(ExperimentChartView, {
        properties, experiments, matchingIds: experiments.map(item => item.id), selectedIds: [],
        configuration: { ...createChartConfiguration(properties), chartType: 'scatterplot', chartAxes: { x: 'inputs:Additive', y: 'outputs:Strength' } },
        showControls, isFiltered: false, onChartAction: noop, onOpen: noop, onResetQuery: noop,
      }))
      assert.doesNotMatch(html, /Select range|Finish selecting|Enter numeric bounds|chart-range-tools|Drawing a new range/)
      assert.match(html, /class="scatter-point/)
      assert.match(html, /Exclude zero inputs/)
      assert.match(html, /Open details/)
    }
  })
})
