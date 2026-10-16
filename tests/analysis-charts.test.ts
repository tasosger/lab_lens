import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pearsonCorrelation } from '../src/charts/correlation.ts'
import { buildPieData, pieSlicePath } from '../src/charts/pie.ts'
import { linearScale } from '../src/charts/numericScale.ts'
import { createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { createDashboardRepository } from '../src/dashboards/repository.ts'
import { decodeDashboardStore, DashboardValidationError } from '../src/dashboards/validation.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import type { Experiment, PropertyId } from '../src/data/types.ts'
import { buildCorrelationMatrix, buildParallelData, matchingExperiments, propertyData, selectedProperties } from '../src/features/charts/analysisData.ts'
import { createChartConfiguration, reduceChartConfiguration, type ChartAction } from '../src/features/charts/chartConfiguration.ts'
import { createDashboardDraft, dashboardReducer } from '../src/features/dashboards/dashboardReducer.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

const repo = createExperimentRepository(experimentFixture())
const experiments = repo.list().items
const properties = repo.getProperties()
const additive = properties.find(p => p.id === 'inputs:Additive')!
const strength = properties.find(p => p.id === 'outputs:Strength')!
const items = (values: readonly number[]) => values.map((value, i) => ({ id: `E${i}`, label: `Experiment ${i}`, value }))
const near = (actual: number | null, expected: number) => { assert.notEqual(actual, null); assert.ok(Math.abs(actual! - expected) < 1e-12, `${actual} != ${expected}`) }
const now = '2026-10-15T17:00:00.000Z'

describe('Pearson property correlations', () => {
  it('computes positive, negative, zero and imperfect relationships', () => {
    near(pearsonCorrelation([[0, 10], [1, 12], [2, 14]]).value, 1)
    near(pearsonCorrelation([[0, 10], [1, 8], [2, 6]]).value, -1)
    near(pearsonCorrelation([[-1, 1], [0, 0], [1, 1]]).value, 0)
    near(pearsonCorrelation([[1, 1], [2, 3], [3, 2]]).value, 0.5)
  })

  it('uses only complete finite pairs and includes zeros', () => {
    const result = pearsonCorrelation([[undefined, 100], [100, undefined], [NaN, 10], [0, 0], [1, 2], [2, 4], [3, Infinity]])
    assert.equal(result.count, 3)
    assert.equal(result.unavailable, null)
    near(result.value, 1)
  })

  it('reports insufficient samples and constant properties without inventing zero correlation', () => {
    for (const pairs of [[], [[0, 1]], [[0, 1], [1, 0]]] as const) {
      assert.deepEqual(pearsonCorrelation(pairs), { value: null, count: pairs.length, unavailable: 'too-few-pairs' })
    }
    for (const value of [0, 8, -8, Number.MAX_VALUE, Number.MIN_VALUE]) {
      assert.deepEqual(pearsonCorrelation([[value, 1], [value, 2], [value, 3]]), { value: null, count: 3, unavailable: 'constant-values' })
    }
    assert.equal(pearsonCorrelation([[1, 9], [2, 9], [3, 9]]).unavailable, 'constant-values')
  })

  it('is symmetric and remains finite at extreme magnitudes', () => {
    for (const magnitude of [Number.MAX_VALUE, Number.MIN_VALUE * 4, 1]) {
      const pairs = [[-magnitude, magnitude], [0, 0], [magnitude, -magnitude]] as const
      near(pearsonCorrelation(pairs).value, -1)
      near(pearsonCorrelation(pairs.map(([x, y]) => [y, x])).value, -1)
    }
  })

  it('keeps independent row and column choices, including properties with shared names', () => {
    const columns = selectedProperties(properties, [strength.id, 'outputs:Shared'])
    const rows = selectedProperties(properties, ['inputs:Shared', additive.id])
    const matrix = buildCorrelationMatrix(experiments, columns, rows)
    assert.deepEqual(matrix.map(row => row.property.id), ['inputs:Shared', additive.id])
    assert.deepEqual(matrix[1]!.cells.map(cell => cell.x.id), [strength.id, 'outputs:Shared'])
    assert.equal(matrix[1]!.cells[0]!.count, 3)
    near(matrix[1]!.cells[0]!.value, -Math.sqrt(3) / 2)
    assert.equal(matrix[0]!.cells[1]!.value, null)
    assert.equal(matrix[0]!.cells[1]!.count, 1)
  })
})

describe('pie experiment groups', () => {
  it('counts exact values, retaining negative and zero values and experiment identities', () => {
    const data = buildPieData(items([-2, 0, -0, 4, 4, 4]), 'values', 5)
    assert.deepEqual(data.slices.map(slice => slice.items.length), [1, 2, 3])
    assert.deepEqual(data.slices.map(slice => slice.label), ['-2', '0', '4'])
    assert.deepEqual(data.slices.map(slice => slice.fraction), [1 / 6, 2 / 6, 3 / 6])
    assert.equal(new Set(data.slices.flatMap(slice => slice.items.map(item => item.id))).size, 6)
    near(data.slices[2]!.endAngle, Math.PI * 2)
  })

  it('uses histogram boundary semantics for ranges and leaves out empty slices', () => {
    const data = buildPieData(items([0, 0, 2, 4]), 'ranges', 4)
    assert.deepEqual(data.slices.map(slice => slice.items.map(item => item.value)), [[0, 0], [2], [4]])
    assert.equal(data.slices.reduce((total, slice) => total + slice.fraction, 0), 1)
    assert.ok(data.slices.every(slice => slice.endAngle > slice.startAngle))
  })

  it('uses only recorded values for percentages and handles empty or constant data', () => {
    const data = buildPieData(items([NaN, Infinity, 0, 0]), 'values', 3)
    assert.equal(data.omittedCount, 2)
    assert.equal(data.count, 2)
    assert.equal(data.slices[0]!.fraction, 1)
    assert.deepEqual(buildPieData([], 'ranges', 5).slices, [])
    const constant = buildPieData(items([4, 4, 4]), 'ranges', 10)
    assert.equal(constant.slices.length, 1)
    assert.equal(constant.slices[0]!.fraction, 1)
    assert.equal((pieSlicePath(0, Math.PI * 2).match(/ A /g) ?? []).length, 2)
    assert.doesNotMatch(pieSlicePath(0, Math.PI / 2), /NaN|Infinity/)
  })

  it('distinguishes exact values even when their formatted labels round alike', () => {
    const data = buildPieData(items([1, 1 + Number.EPSILON]), 'values', 5, value => value.toFixed(2))
    assert.deepEqual(data.slices.map(slice => slice.label), ['1', '1.0000000000000002'])
  })
})

describe('parallel coordinates and filtered analysis data', () => {
  it('keeps axis order and includes only experiments with every chosen value', () => {
    const axes = selectedProperties(properties, [strength.id, additive.id, strength.id, 'inputs:Unknown'])
    const data = buildParallelData(experiments, axes)
    assert.deepEqual(data.dimensions.map(axis => axis.id), [strength.id, additive.id])
    assert.deepEqual(data.lines.map(line => [line.id, line.values]), [['EXP_A', [2, 2]], ['EXP_B', [10, 1]], ['EXP_C', [10, 0]]])
    assert.equal(data.omittedCount, 2)
    const reversed = buildParallelData(experiments, [...axes].reverse())
    assert.deepEqual(reversed.lines[0]!.values, [2, 2])
    assert.deepEqual(reversed.lines[2]!.values, [0, 10])
  })

  it('uses independent finite scales even for constant and extreme axes', () => {
    const extreme: Experiment[] = [-Number.MAX_VALUE, 0, Number.MAX_VALUE].map((value, i) => ({ id: String(i), inputs: { Additive: 0 }, outputs: { Strength: value } }))
    const data = buildParallelData(extreme, [additive, strength])
    assert.equal(data.lines.length, 3)
    assert.notDeepEqual(data.dimensions[0]!.domain, data.dimensions[1]!.domain)
    for (const [index, dimension] of data.dimensions.entries()) {
      assert.ok(dimension.domain.every(Number.isFinite))
      const scale = linearScale(dimension.domain, [350, 90])
      for (const line of data.lines) assert.ok(Number.isFinite(scale(line.values[index]!)))
    }
    assert.equal(buildParallelData(extreme, [additive]).lines.length, 0)
    assert.equal(buildParallelData([], [additive, strength]).lines.length, 0)
  })

  it('omits nonfinite values as well as missing values', () => {
    const input: Experiment[] = [{ id: 'nan', inputs: { Additive: NaN }, outputs: { Strength: 1 } },
      { id: 'inf', inputs: { Additive: 0 }, outputs: { Strength: Infinity } }]
    assert.equal(buildParallelData(input, [additive, strength]).omittedCount, 2)
    assert.deepEqual(propertyData(input, additive), { items: [{ id: 'inf', label: 'inf', value: 0 }], omittedCount: 1 })
  })

  it('applies search, numeric filters, and existing plot ranges before every aggregation', () => {
    let state = createWorkspaceState(properties)
    state = workspaceReducer(state, { type: 'search', value: 'EXP_' })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: strength.id, operator: 'gte', value: 0 } })
    state = workspaceReducer(state, { type: 'set-plot-filter', filter: { xPropertyId: additive.id, yPropertyId: strength.id, range: { x: [0, 1], y: [8, 12] } } })
    const context = repo.list(getWorkspaceQuery(state, { includePlotFilter: false })).items
    const ids = repo.list(getWorkspaceQuery(state)).items.map(item => item.id)
    const matching = matchingExperiments(context, ids)
    assert.equal(context.length, 3)
    assert.deepEqual(matching.map(item => item.id), ['EXP_B', 'EXP_C'])
    assert.equal(buildPieData(propertyData(matching, additive).items, 'values', 5).count, 2)
    assert.equal(buildCorrelationMatrix(matching, [strength], [additive])[0]!.cells[0]!.count, 2)
    assert.equal(buildParallelData(matching, [additive, strength]).lines.length, 2)
    assert.deepEqual(matchingExperiments(context, []), [])
  })

  it('accounts for the supplied dataset without losing records or producing invalid correlations', () => {
    const real = getExperimentRepository()
    const data = real.list().items
    const axes = real.getProperties()
    for (const property of axes) {
      const values = propertyData(data, property)
      const pie = buildPieData(values.items, 'ranges', 5)
      assert.equal(pie.count + values.omittedCount, data.length)
      assert.equal(new Set(pie.slices.flatMap(slice => slice.items.map(item => item.id))).size, pie.count)
    }
    for (const row of buildCorrelationMatrix(data, axes, axes)) {
      for (const cell of row.cells) assert.ok(cell.value === null || (Number.isFinite(cell.value) && Math.abs(cell.value) <= 1))
    }
    const parallel = buildParallelData(data, axes)
    assert.equal(parallel.lines.length + parallel.omittedCount, data.length)
  })
})

describe('analysis chart state and dashboard persistence', () => {
  const actions: ChartAction[] = [
    { type: 'pie-property', propertyId: strength.id }, { type: 'pie-grouping', grouping: 'values' }, { type: 'pie-bins', bins: 7 },
    { type: 'heatmap-axis', axis: 'x', propertyIds: [additive.id] }, { type: 'heatmap-axis', axis: 'y', propertyIds: [strength.id] },
    { type: 'parallel-properties', propertyIds: [strength.id, additive.id] },
  ]

  it('retains settings across chart types and opens a heatmap pair in 2D without resetting the query', () => {
    let state = createWorkspaceState(properties)
    state = workspaceReducer(state, { type: 'chart-mode', mode: '3d' })
    state = workspaceReducer(state, { type: 'search', value: 'EXP_C' })
    for (const action of actions) state = workspaceReducer(state, action)
    for (const chartType of ['pie', 'heatmap', 'parallel', 'scatterplot'] as const) state = workspaceReducer(state, { type: 'chart-type', chartType })
    assert.equal(state.pieProperty, strength.id)
    assert.equal(state.pieGrouping, 'values')
    assert.equal(state.pieBins, 7)
    assert.deepEqual(state.parallelProperties, [strength.id, additive.id])
    state = workspaceReducer(state, { type: 'inspect-heatmap-cell', xPropertyId: strength.id, yPropertyId: additive.id })
    assert.equal(state.chartType, 'scatterplot')
    assert.equal(state.chartMode, '2d')
    assert.deepEqual(state.chartAxes, { x: strength.id, y: additive.id })
    assert.deepEqual(state.heatmapX, [additive.id])
    assert.deepEqual(state.heatmapY, [strength.id])
    assert.equal(state.search, 'EXP_C')
  })

  it('copies ordered choices, removes duplicates and allows an empty draft selection', () => {
    const ids: PropertyId[] = [strength.id, additive.id, strength.id]
    const initial = createChartConfiguration(properties)
    const changed = reduceChartConfiguration(initial, { type: 'parallel-properties', propertyIds: ids })
    ids.reverse()
    assert.deepEqual(changed.parallelProperties, [strength.id, additive.id])
    assert.deepEqual(reduceChartConfiguration(changed, { type: 'heatmap-axis', axis: 'x', propertyIds: [] }).heatmapX, [])
    assert.equal(reduceChartConfiguration(changed, { type: 'pie-bins', bins: 0 }), changed)
    assert.deepEqual(createChartConfiguration([]).parallelProperties, [])
    assert.equal(createChartConfiguration([]).pieProperty, null)
  })

  it('saves and reloads each new chart with independent widget settings', () => {
    for (const chartType of ['pie', 'heatmap', 'parallel'] as const) {
      const initial = createDefaultDashboard(properties, now)
      const id = initial.widgets[0]!.id
      let draft = createDashboardDraft(initial)
      for (const action of [...actions, { type: 'chart-type', chartType } as const]) draft = dashboardReducer(draft, { type: 'chart', id, action })
      assert.deepEqual(draft.dashboard.widgets[1], initial.widgets[1])
      let raw: string | null = null
      const storage = { read: () => raw, write: (value: string) => { raw = value } }
      const saved = createDashboardRepository(storage, properties, () => now).save(draft.dashboard)
      assert.deepEqual(createDashboardRepository(storage, properties).list()[0], saved)
      assert.equal(saved.widgets[0]!.configuration.chartType, chartType)
      assert.deepEqual(saved.widgets[0]!.configuration.parallelProperties, [strength.id, additive.id])
    }
  })

  it('loads pre-feature dashboards with usable defaults and preserves existing chart settings', () => {
    const initial = createDefaultDashboard(properties, now)
    const legacy = JSON.parse(JSON.stringify(initial))
    for (const widget of legacy.widgets) {
      for (const key of ['pieProperty', 'pieGrouping', 'pieBins', 'heatmapX', 'heatmapY', 'parallelProperties']) delete widget.configuration[key]
      widget.configuration.chartType = 'histogram'
      widget.configuration.histogramBins = 8
    }
    const restored = decodeDashboardStore(JSON.stringify({ version: 1, dashboards: [legacy] }), properties).dashboards[0]!
    const defaults = createChartConfiguration(properties)
    for (const widget of restored.widgets) {
      assert.equal(widget.configuration.chartType, 'histogram')
      assert.equal(widget.configuration.histogramBins, 8)
      assert.deepEqual(widget.configuration.heatmapX, defaults.heatmapX)
      assert.deepEqual(widget.configuration.heatmapY, defaults.heatmapY)
      assert.deepEqual(widget.configuration.parallelProperties, defaults.parallelProperties)
    }
  })

  it('rejects malformed persisted settings and unknown or duplicate axis properties', () => {
    const initial = createDefaultDashboard(properties, now)
    for (const invalid of [{ pieGrouping: 'sum' }, { pieBins: 0 }, { pieBins: 51 }, { pieBins: '5' }, { pieProperty: 'inputs:Unknown' },
      { heatmapX: null }, { heatmapY: ['outputs:Unknown'] }, { heatmapX: [additive.id, additive.id] }, { parallelProperties: [null] }]) {
      const changed = { ...initial, widgets: initial.widgets.map(widget => ({ ...widget, configuration: { ...widget.configuration, ...invalid } })) }
      assert.throws(() => decodeDashboardStore(JSON.stringify({ version: 1, dashboards: [changed] }), properties), DashboardValidationError)
    }
  })
})
