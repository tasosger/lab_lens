import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPieData } from '../src/charts/pie.ts'
import { createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { createDashboardRepository } from '../src/dashboards/repository.ts'
import { validateDashboard, DashboardValidationError } from '../src/dashboards/validation.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { buildCorrelationMatrix, buildParallelData, matchingExperiments, propertyData } from '../src/features/charts/analysisData.ts'
import { createChartConfiguration, reduceChartConfiguration } from '../src/features/charts/chartConfiguration.ts'
import { chartIngredientInputs, excludeChartZeroInputs } from '../src/features/charts/inputPresence.ts'
import { buildExperimentHistogram } from '../src/features/charts/histogramData.ts'
import { buildScatter3DData, buildScatterData } from '../src/features/charts/scatterData.ts'
import { createDashboardDraft, dashboardReducer } from '../src/features/dashboards/dashboardReducer.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'

const repo = createExperimentRepository({
  A: { inputs: { Additive: 0, Binder: 1, 'Oven Temperature': 0 }, outputs: { Strength: 0 } },
  B: { inputs: { Additive: 1, Binder: 0, 'Oven Temperature': 0 }, outputs: { Strength: 2 } },
  C: { inputs: { Additive: 2, Binder: 1, 'Oven Temperature': 10 }, outputs: { Strength: 4 } },
  D: { inputs: { Additive: 3, Binder: 1, 'Oven Temperature': 20 }, outputs: { Strength: 6 } },
  E: { inputs: { Binder: 1, 'Oven Temperature': 0 }, outputs: { Strength: 8 } },
})
const properties = repo.getProperties()
const experiments = repo.list().items
const additive = properties.find(p => p.id === 'inputs:Additive')!
const binder = properties.find(p => p.id === 'inputs:Binder')!
const temperature = properties.find(p => p.id === 'inputs:Oven Temperature')!
const strength = properties.find(p => p.id === 'outputs:Strength')!
const defaults = createChartConfiguration(properties)
const enabled = { ...defaults, hideZeroInputs: true }

describe('chart-local zero input exclusion', () => {
  it('removes only the selected pie input zeros and recalculates shares over the remaining records', () => {
    const config = { ...enabled, chartType: 'pie' as const, pieProperty: additive.id }
    const filtered = excludeChartZeroInputs(experiments, config, properties)
    assert.deepEqual(filtered.map(item => item.id), ['B', 'C', 'D', 'E'])
    const values = propertyData(filtered, additive)
    assert.equal(values.omittedCount, 1)
    for (const grouping of ['values', 'ranges'] as const) {
      const pie = buildPieData(values.items, grouping, 3)
      assert.equal(pie.count, 3)
      assert.ok(pie.slices.every(slice => slice.fraction === 1 / 3))
      assert.ok(pie.slices.flatMap(slice => slice.items).every(item => item.value !== 0))
    }
    assert.strictEqual(excludeChartZeroInputs(experiments, { ...config, hideZeroInputs: false }, properties), experiments)
    assert.equal(repo.getById('A')!.inputs.Additive, 0)
  })

  it('filters before histogram bins are calculated and still respects existing matching IDs', () => {
    const config = { ...enabled, chartType: 'histogram' as const, histogramProperty: additive.id }
    const filtered = excludeChartZeroInputs(experiments, config, properties)
    const histogram = buildExperimentHistogram(filtered, additive, 2, ['A', 'C', 'D'])
    assert.equal(histogram.count, 2)
    assert.deepEqual(histogram.domain, [2, 3])
    assert.deepEqual(histogram.bins.flatMap(bin => bin.items.map(item => item.id)), ['C', 'D'])
    const pie = buildPieData(propertyData(matchingExperiments(filtered, ['A', 'C', 'D']), additive).items, 'values', 5)
    assert.deepEqual(pie.slices.map(slice => slice.fraction), [0.5, 0.5])
  })

  it('uses only active scatter axes, including Z only when the chart is 3D', () => {
    const config = { ...enabled, chartAxes: { x: additive.id, y: strength.id }, chartZ: binder.id }
    let filtered = excludeChartZeroInputs(experiments, config, properties)
    assert.deepEqual(chartIngredientInputs(config, properties).map(p => p.id), [additive.id])
    assert.deepEqual(buildScatterData(filtered, additive, strength).points.map(p => p.id), ['B', 'C', 'D'])
    filtered = excludeChartZeroInputs(experiments, { ...config, chartMode: '3d' }, properties)
    assert.deepEqual(buildScatter3DData(filtered, additive, strength, binder).points.map(p => p.id), ['C', 'D'])
  })

  it('excludes parallel lines with a zero on a chosen input and retains unrelated input zeros', () => {
    const config = { ...enabled, chartType: 'parallel' as const, parallelProperties: [binder.id, strength.id] }
    const filtered = excludeChartZeroInputs(experiments, config, properties)
    assert.deepEqual(buildParallelData(filtered, [binder, strength]).lines.map(line => line.id), ['A', 'C', 'D', 'E'])
    assert.deepEqual(chartIngredientInputs({ ...config, parallelProperties: [binder.id, binder.id] }, properties).map(p => p.id), [binder.id])
  })

  it('retains zero outputs and process values, and follows property changes', () => {
    for (const property of [strength, temperature]) {
      const config = { ...enabled, chartType: 'pie' as const, pieProperty: property.id }
      assert.deepEqual(chartIngredientInputs(config, properties), [])
      assert.strictEqual(excludeChartZeroInputs(experiments, config, properties), experiments)
      assert.ok(buildPieData(propertyData(experiments, property).items, 'values', 5).slices.some(slice => slice.id === 'value:0'))
    }
    const config = { ...enabled, chartType: 'pie' as const, pieProperty: binder.id }
    assert.deepEqual(excludeChartZeroInputs(experiments, config, properties).map(item => item.id), ['A', 'C', 'D', 'E'])
  })

  it('excludes zeros per heatmap cell instead of requiring all matrix inputs at once', () => {
    const config = { ...enabled, chartType: 'heatmap' as const, heatmapX: [strength.id], heatmapY: [additive.id, binder.id] }
    assert.strictEqual(excludeChartZeroInputs(experiments, config, properties), experiments)
    const matrix = buildCorrelationMatrix(experiments, [strength], [additive, binder], true)
    assert.equal(matrix[0]!.cells[0]!.count, 3)
    assert.equal(matrix[1]!.cells[0]!.count, 4)
    assert.ok(Math.abs(matrix[0]!.cells[0]!.value! - 1) < 1e-12)
    assert.equal(buildCorrelationMatrix(experiments, [binder], [additive], true)[0]!.cells[0]!.count, 2)
    assert.equal(buildCorrelationMatrix(experiments, [strength], [temperature], true)[0]!.cells[0]!.count, 5)
    assert.equal(buildCorrelationMatrix(experiments, [strength], [additive])[0]!.cells[0]!.count, 4)
  })

  it('keeps workspace queries, selections, statistics, and original JSON values unchanged', () => {
    const initial = workspaceReducer(createWorkspaceState(properties), { type: 'toggle-selection', id: 'A' })
    const statistics = structuredClone(repo.getStatistics())
    const changed = workspaceReducer(initial, { type: 'hide-zero-inputs', value: true })
    assert.deepEqual(getWorkspaceQuery(changed), getWorkspaceQuery(initial))
    assert.deepEqual(changed.selectedIds, ['A'])
    assert.equal(repo.list(getWorkspaceQuery(changed)).matched, 5)
    assert.deepEqual(repo.getStatistics(), statistics)
    assert.equal(initial.hideZeroInputs, false)
    const scatter = reduceChartConfiguration(changed, { type: 'inspect-heatmap-cell', xPropertyId: additive.id, yPropertyId: strength.id })
    assert.equal(scatter.hideZeroInputs, true)
    assert.deepEqual(buildScatterData(excludeChartZeroInputs(experiments, scatter, properties), additive, strength).points.map(p => p.id), ['B', 'C', 'D'])
  })

  it('filters the supplied Polymer 1 pie to its 11 present experiments', () => {
    const real = getExperimentRepository()
    const properties = real.getProperties()
    const property = properties.find(p => p.id === 'inputs:Polymer 1')!
    const filtered = excludeChartZeroInputs(real.list().items, { ...createChartConfiguration(properties),
      chartType: 'pie', pieProperty: property.id, hideZeroInputs: true }, properties)
    const pie = buildPieData(propertyData(filtered, property).items, 'ranges', 5)
    assert.equal(real.list().total, 25)
    assert.equal(pie.count, 11)
    assert.equal(new Set(pie.slices.flatMap(slice => slice.items.map(item => item.id))).size, 11)
  })

  it('saves the toggle independently per dashboard chart and defaults older charts to off', () => {
    const now = '2026-10-15T22:00:00.000Z'
    const original = createDefaultDashboard(properties, now)
    const changed = dashboardReducer(createDashboardDraft(original), { type: 'chart', id: original.widgets[0]!.id,
      action: { type: 'hide-zero-inputs', value: true } })
    assert.deepEqual(changed.dashboard.widgets[1], original.widgets[1])
    let raw: string | null = null
    const storage = { read: () => raw, write: (value: string) => { raw = value } }
    createDashboardRepository(storage, properties, () => now).save(changed.dashboard)
    const loaded = createDashboardRepository(storage, properties).list()[0]!
    assert.equal(loaded.widgets[0]!.configuration.hideZeroInputs, true)
    assert.equal(loaded.widgets[1]!.configuration.hideZeroInputs, false)
    const legacy = JSON.parse(JSON.stringify(original))
    for (const widget of legacy.widgets) delete widget.configuration.hideZeroInputs
    assert.ok(validateDashboard(legacy, properties).widgets.every(widget => widget.configuration.hideZeroInputs === false))
    for (const invalid of [null, 'true', 1]) {
      legacy.widgets[0].configuration.hideZeroInputs = invalid
      assert.throws(() => validateDashboard(legacy, properties), DashboardValidationError)
    }
  })
})
