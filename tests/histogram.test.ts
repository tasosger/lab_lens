import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildHistogram, histogramBinLabel, type HistogramBinCount } from '../src/charts/histogram.ts'
import { linearScale } from '../src/charts/numericScale.ts'
import { createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { createDashboardRepository } from '../src/dashboards/repository.ts'
import { decodeDashboardStore, DashboardValidationError } from '../src/dashboards/validation.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { createChartConfiguration, reduceChartConfiguration } from '../src/features/charts/chartConfiguration.ts'
import { buildExperimentHistogram } from '../src/features/charts/histogramData.ts'
import { createDashboardDraft, dashboardReducer } from '../src/features/dashboards/dashboardReducer.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

const items = (values: readonly number[]) => values.map((value, index) => ({ id: `E${index}`, label: `Experiment ${index}`, value }))
const count = (data: ReturnType<typeof buildHistogram>) => data.bins.map(bin => bin.items.length)
const repository = createExperimentRepository(experimentFixture())
const properties = repository.getProperties()
const strength = properties.find(property => property.id === 'outputs:Strength')!
const additive = properties.find(property => property.id === 'inputs:Additive')!
const now = '2026-10-15T17:00:00.000Z'

describe('histogram bins', () => {
  it('assigns interior boundaries to the next bin and includes the maximum exactly once', () => {
    const input = Object.freeze(items([-2, 0, 0, 2, 3, 4]).map(item => Object.freeze(item)))
    const histogram = buildHistogram(input, 3)
    assert.deepEqual(count(histogram), [1, 2, 3])
    assert.deepEqual(histogram.bins.map(bin => [bin.lower, bin.upper, bin.includeUpper]), [
      [-2, 0, false], [0, 2, false], [2, 4, true],
    ])
    assert.deepEqual(histogram.bins.flatMap(bin => bin.items), input)
    assert.equal(histogram.count, 6)
    assert.equal(histogram.omittedCount, 0)
  })

  it('retains empty bins, zero values, negative values, and repeated measurements', () => {
    const histogram = buildHistogram(items([-10, -10, 0, 10]), 4)
    assert.deepEqual(count(histogram), [2, 0, 1, 1])
    assert.deepEqual(histogram.domain, [-10, 10])
    assert.equal(histogram.bins.flatMap(bin => bin.items).length, 4)
  })

  it('uses one usable bin for a single measurement or constant data', () => {
    for (const value of [0, -4, Number.MIN_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE]) {
      for (const values of [[value], [value, value, value]]) {
        const histogram = buildHistogram(items(values), 20)
        assert.deepEqual(count(histogram), [values.length])
        assert.equal(histogram.bins[0]!.lower, value)
        assert.equal(histogram.bins[0]!.upper, value)
        assert.ok(histogram.domain.every(Number.isFinite))
        assert.ok(histogram.domain[0] < histogram.domain[1])
        assert.ok(Number.isFinite(linearScale(histogram.domain, [0, 600])(value)))
      }
    }
  })

  it('omits nonfinite values and returns an empty distribution when none remain', () => {
    const histogram = buildHistogram(items([NaN, Infinity, -Infinity, 0]), 'auto')
    assert.equal(histogram.count, 1)
    assert.equal(histogram.omittedCount, 3)
    assert.deepEqual(count(histogram), [1])
    for (const values of [[], [NaN, Infinity]]) {
      const empty = buildHistogram(items(values))
      assert.equal(empty.count, 0)
      assert.equal(empty.omittedCount, values.length)
      assert.deepEqual(empty.bins, [])
    }
  })

  it('keeps every finite measurement in exactly one bin at floating-point extremes', () => {
    for (const values of [
      [-Number.MAX_VALUE, -1, 0, 1, Number.MAX_VALUE],
      [0, Number.MIN_VALUE, Number.MIN_VALUE * 2],
      [1, 1 + Number.EPSILON],
      [Number.MAX_VALUE / 2, Number.MAX_VALUE],
    ]) {
      const histogram = buildHistogram(items(values), 50)
      const members = histogram.bins.flatMap(bin => bin.items)
      assert.equal(members.length, values.length)
      assert.equal(new Set(members.map(item => item.id)).size, values.length)
      for (const bin of histogram.bins) {
        assert.ok(Number.isFinite(bin.lower) && Number.isFinite(bin.upper))
        assert.ok(bin.lower < bin.upper)
        for (const item of bin.items) {
          assert.ok(item.value >= bin.lower)
          assert.ok(bin.includeUpper ? item.value <= bin.upper : item.value < bin.upper)
        }
      }
    }
  })

  it('chooses a bounded automatic count and rejects invalid bin counts', () => {
    assert.equal(buildHistogram(items(Array.from({ length: 25 }, (_, i) => i))).bins.length, 5)
    assert.equal(buildHistogram(items(Array.from({ length: 2601 }, (_, i) => i))).bins.length, 50)
    for (const bins of [0, -1, 51, 1.5, NaN, Infinity, '5', null]) {
      assert.throws(() => buildHistogram([], bins as HistogramBinCount), RangeError)
    }
  })

  it('labels inclusive and exclusive endpoints, including boundaries hidden by rounding', () => {
    const bins = buildHistogram(items([0, 1, 2]), 2).bins
    assert.equal(histogramBinLabel(bins[0]!, String), '0 ≤ value < 1')
    assert.equal(histogramBinLabel(bins[1]!, String), '1 ≤ value ≤ 2')
    const narrow = buildHistogram(items([1, 1 + Number.EPSILON]), 1).bins[0]!
    assert.equal(histogramBinLabel(narrow, value => value.toFixed(2)), '1 ≤ value ≤ 1.0000000000000002')
  })
})

describe('experiment histograms and filters', () => {
  it('excludes missing properties while preserving zeros and experiment identities', () => {
    const histogram = buildExperimentHistogram(repository.list().items, additive, 2)
    assert.deepEqual(count(histogram), [2, 2])
    assert.equal(histogram.omittedCount, 1)
    assert.deepEqual(histogram.bins[0]!.items.map(item => item.id), ['EXP_C', 'EXP_D'])
    assert.deepEqual(histogram.bins[1]!.items.map(item => item.id), ['EXP_A', 'EXP_B'])
    assert.deepEqual(count(buildExperimentHistogram(repository.list().items, strength, 3)), [1, 1, 2])
  })

  it('counts only matching experiments after applying numeric filters and search', () => {
    let state = createWorkspaceState(properties)
    state = workspaceReducer(state, { type: 'chart-type', chartType: 'histogram' })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'gte', value: 0 } })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'inputs:Additive', operator: 'between', min: 0, max: 1 } })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'between', min: 8, max: 12 } })
    const context = repository.list().items
    const matching = repository.list(getWorkspaceQuery(state)).items.map(item => item.id)
    assert.equal(context.length, 5)
    const histogram = buildExperimentHistogram(context, strength, 'auto', matching)
    assert.deepEqual(histogram.bins.flatMap(bin => bin.items).map(item => item.id), ['EXP_B', 'EXP_C'])
    assert.equal(histogram.count, 2)
    assert.equal(buildExperimentHistogram(context, strength, 'auto', []).count, 0)
    const searched = workspaceReducer(state, { type: 'search', value: 'EXP_C' })
    assert.equal(buildExperimentHistogram(repository.list(getWorkspaceQuery(searched)).items, strength).count, 1)
  })

  it('accounts for all recorded and missing values for every property in the real dataset', () => {
    const real = getExperimentRepository()
    for (const property of real.getProperties()) {
      const histogram = buildExperimentHistogram(real.list().items, property, 10)
      assert.equal(histogram.count + histogram.omittedCount, 25)
      assert.equal(histogram.bins.reduce((sum, bin) => sum + bin.items.length, 0), histogram.count)
      assert.equal(new Set(histogram.bins.flatMap(bin => bin.items.map(item => item.id))).size, histogram.count)
    }
  })
})

describe('histogram chart settings and saved dashboards', () => {
  it('retains independent histogram and scatterplot settings when switching types and views', () => {
    const initial = createWorkspaceState(properties)
    let chart = workspaceReducer(initial, { type: 'chart-mode', mode: '3d' })
    chart = workspaceReducer(chart, { type: 'chart-type', chartType: 'histogram' })
    chart = workspaceReducer(chart, { type: 'histogram-property', propertyId: additive.id })
    chart = workspaceReducer(chart, { type: 'histogram-bins', bins: 8 })
    chart = workspaceReducer(chart, { type: 'view', view: 'explore' })
    chart = workspaceReducer(chart, { type: 'view', view: 'charts' })
    chart = workspaceReducer(chart, { type: 'chart-type', chartType: 'scatterplot' })
    assert.equal(chart.chartMode, '3d')
    assert.deepEqual(chart.chartAxes, initial.chartAxes)
    assert.deepEqual(chart.chartCamera, initial.chartCamera)
    assert.equal(chart.histogramProperty, additive.id)
    assert.equal(chart.histogramBins, 8)
    assert.equal(initial.chartType, 'scatterplot')
    assert.equal(initial.histogramBins, 'auto')
    assert.equal(createChartConfiguration([]).histogramProperty, null)
    assert.equal(reduceChartConfiguration(chart, { type: 'histogram-bins', bins: 0 }), chart)
  })

  it('saves and reloads mixed chart types without affecting sibling widgets or scatterplot axes', () => {
    const initial = createDefaultDashboard(properties, now)
    const id = initial.widgets[0]!.id
    let draft = createDashboardDraft(initial)
    draft = dashboardReducer(draft, { type: 'chart', id, action: { type: 'chart-type', chartType: 'histogram' } })
    draft = dashboardReducer(draft, { type: 'chart', id, action: { type: 'histogram-property', propertyId: additive.id } })
    draft = dashboardReducer(draft, { type: 'chart', id, action: { type: 'histogram-bins', bins: 8 } })
    assert.deepEqual(draft.dashboard.widgets[1], initial.widgets[1])
    assert.equal(initial.widgets[0]!.configuration.chartType, 'scatterplot')
    assert.deepEqual(draft.dashboard.widgets[0]!.configuration.chartAxes, initial.widgets[0]!.configuration.chartAxes)
    let saved: string | null = null
    const storage = { read: () => saved, write: (value: string) => { saved = value } }
    const library = createDashboardRepository(storage, properties, () => now)
    const result = library.save(draft.dashboard)
    const reloaded = createDashboardRepository(storage, properties).list()[0]!
    assert.deepEqual(reloaded, result)
    assert.equal(reloaded.widgets[0]!.configuration.chartType, 'histogram')
    assert.equal(reloaded.widgets[0]!.configuration.histogramProperty, additive.id)
    assert.equal(reloaded.widgets[0]!.configuration.histogramBins, 8)
    assert.equal(reloaded.widgets[1]!.configuration.chartType, 'scatterplot')
  })

  it('loads older saved dashboards with scatterplot defaults and retains their axes and camera', () => {
    const dashboard = createDefaultDashboard(properties, now)
    const legacy = JSON.parse(JSON.stringify(dashboard))
    for (const widget of legacy.widgets) {
      delete widget.configuration.chartType
      delete widget.configuration.histogramProperty
      delete widget.configuration.histogramBins
    }
    const restored = decodeDashboardStore(JSON.stringify({ version: 1, dashboards: [legacy] }), properties).dashboards[0]!
    for (const [index, widget] of restored.widgets.entries()) {
      assert.equal(widget.configuration.chartType, 'scatterplot')
      assert.equal(widget.configuration.histogramBins, 'auto')
      assert.equal(widget.configuration.histogramProperty, widget.configuration.chartAxes.y)
      assert.deepEqual(widget.configuration.chartAxes, dashboard.widgets[index]!.configuration.chartAxes)
      assert.deepEqual(widget.configuration.chartCamera, dashboard.widgets[index]!.configuration.chartCamera)
    }
  })

  it('rejects invalid persisted histogram settings', () => {
    const dashboard = createDefaultDashboard(properties, now)
    for (const invalid of [{ chartType: 'unsupported' }, { chartType: null }, { histogramBins: 0 }, { histogramBins: 51 },
      { histogramBins: 2.5 }, { histogramBins: '5' }, { histogramBins: null }, { histogramProperty: 'inputs:Unknown' }]) {
      const changed = { ...dashboard, widgets: dashboard.widgets.map(widget => ({ ...widget, configuration: { ...widget.configuration, ...invalid } })) }
      assert.throws(() => decodeDashboardStore(JSON.stringify({ version: 1, dashboards: [changed] }), properties), DashboardValidationError)
    }
  })
})
