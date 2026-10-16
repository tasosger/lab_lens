import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'
import { createExperimentRepository } from '../src/data/repository.ts'
import { experimentFixture } from './fixtures.ts'

const repository = createExperimentRepository(experimentFixture())
const properties = repository.getProperties()
const experiments = repository.list().items
const noop = () => {}
let server: ViteDevServer
before(async () => { server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' }) })
after(async () => { await server?.close() })

const group = { id: 0, operator: 'and', filters: [
  { id: 1, condition: { propertyId: 'outputs:Strength', operator: 'gte', scale: 'percentile', value: 75 } },
  { id: 2, operator: 'or', filters: [
    { id: 3, condition: { propertyId: 'inputs:Additive', operator: 'neq', value: 0 } },
    { id: 4, condition: { propertyId: 'outputs:Cure Time', operator: 'between', scale: 'percentile', min: 25, max: 75 } },
  ] },
] }

describe('simplified filter controls', () => {
  it('starts with property selection and hides unrelated controls', async () => {
    const { FilterGroupEditor } = await server.ssrLoadModule('/src/features/experiments/FilterGroupEditor.tsx')
    const html = renderToStaticMarkup(createElement(FilterGroupEditor, { properties, experiments, dispatch: noop,
      group: { id: 0, operator: 'and', filters: [] } }))
    assert.equal((html.match(/<form /g) ?? []).length, 1)
    assert.match(html, /class="filter-composer"/)
    assert.doesNotMatch(html, /filter-advanced|Match all|Empty groups|Group 0/)
    assert.match(html, /Search inputs and outputs/)
    assert.match(html, /Choose a property/)
    assert.doesNotMatch(html, /type="number"|<select|type="submit"/)
    assert.doesNotMatch(html, /Top 25%|Bottom 25%|Middle 50%|Above median|How percentiles work/)
  })

  it('edits a selected nested condition directly without opening multiple forms', async () => {
    const { FilterGroupEditor } = await server.ssrLoadModule('/src/features/experiments/FilterGroupEditor.tsx')
    const html = renderToStaticMarkup(createElement(FilterGroupEditor, { properties, experiments, dispatch: noop, initialFilterId: 4, group }))
    assert.equal((html.match(/<form /g) ?? []).length, 1)
    assert.doesNotMatch(html, /aria-label="Edit filter Cure Time between P25 and P75"/)
    assert.match(html, /aria-label="Edit filter Strength ≥ P75" aria-expanded="false"/)
    assert.match(html, /Save changes/)
    assert.match(html, /Match all/)
    assert.match(html, /Match any/)
    assert.match(html, /<option value="percentile" selected="">Percentile/)
    assert.match(html, /value="25"/)
    assert.match(html, /value="75"/)
    assert.match(html, /<strong>2<\/strong> of 5 experiments after saving/)
  })

  it('shows editable summary chips with the original grouping and skips empty groups', async () => {
    const { FilterSummary } = await server.ssrLoadModule('/src/features/experiments/FilterSummary.tsx')
    const html = renderToStaticMarkup(createElement(FilterSummary, { properties, onEdit: noop,
      group: { ...group, filters: [...group.filters, { id: 5, operator: 'and', filters: [] }] } }))
    assert.equal((html.match(/<button /g) ?? []).length, 3)
    assert.equal((html.match(/class="filter-summary-group"/g) ?? []).length, 1)
    assert.match(html, /aria-label="Any of these filters"/)
    assert.match(html, /filter-summary-join">and</)
    assert.match(html, /filter-summary-join">or</)
    assert.match(html, /aria-label="Edit filter Additive ≠ 0"/)
  })
})
