import { defaultChartAxes } from '../src/chart-model/scatter.ts'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatTicks, linearScale, numericDomain, numericTicks } from '../src/charts/numericScale.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { buildScatterData } from '../src/features/charts/scatterData.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

describe('scatterplot experiment adapter', () => {
  const repository = createExperimentRepository(experimentFixture())
  const properties = repository.getProperties()
  const x = properties.find((property) => property.id === 'inputs:Additive')!
  const y = properties.find((property) => property.id === 'outputs:Strength')!

  it('keeps zero values and experiment identity, and omits incomplete pairs', () => {
    const experiments = repository.list().items
    const result = buildScatterData(experiments, x, y)
    assert.deepEqual(result.points, [
      { id: 'EXP_A', label: 'EXP_A', x: 2, y: 2 },
      { id: 'EXP_B', label: 'EXP_B', x: 1, y: 10 },
      { id: 'EXP_C', label: 'EXP_C', x: 0, y: 10 },
    ])
    assert.equal(result.omittedCount, 2)
    assert.equal(experiments.length, 5)
    assert.equal(experiments[0]!.inputs.Additive, 2)
  })

  it('handles empty data, missing axes, identical axes, and overlapping points', () => {
    assert.deepEqual(buildScatterData([], x, y), { points: [], omittedCount: 0 })
    const result = buildScatterData(repository.list().items, x, x)
    assert.equal(result.points.length, 4)
    assert.ok(result.points.every((point) => point.x === point.y))
    assert.equal(result.points.filter((point) => point.x === 0).length, 2)
    const missing = { ...y, id: 'outputs:Absent', name: 'Absent' } as const
    assert.equal(buildScatterData(repository.list().items, x, missing).omittedCount, 5)
  })

  it('distinguishes inputs and outputs sharing the same property name', () => {
    const input = properties.find((property) => property.id === 'inputs:Shared')!
    const output = properties.find((property) => property.id === 'outputs:Shared')!
    assert.deepEqual(buildScatterData(repository.list().items, input, output).points, [
      { id: 'EXP_C', label: 'EXP_C', x: 8, y: 100 },
    ])
  })

  it('chooses useful defaults and supports datasets with only one or no properties', () => {
    assert.deepEqual(defaultChartAxes([]), { x: null, y: null })
    assert.deepEqual(defaultChartAxes([y]), { x: y.id, y: y.id })
    assert.deepEqual(defaultChartAxes([x, y]), { x: x.id, y: y.id })
    assert.deepEqual(defaultChartAxes(getExperimentRepository().getProperties()), {
      x: 'inputs:Oven Temperature', y: 'outputs:Tensile Strength',
    })
  })

  it('plots all 25 real experiments for every available axis pair', () => {
    const real = getExperimentRepository()
    for (const xProperty of real.getProperties()) {
      for (const yProperty of real.getProperties()) {
        const result = buildScatterData(real.list().items, xProperty, yProperty)
        assert.equal(result.points.length, 25)
        assert.equal(result.omittedCount, 0)
        assert.equal(new Set(result.points.map((point) => point.id)).size, 25)
        const xScale = linearScale(numericDomain(result.points.map((point) => point.x)), [0, 100])
        const yScale = linearScale(numericDomain(result.points.map((point) => point.y)), [100, 0])
        for (const point of result.points) {
          assert.ok(xScale(point.x) >= 0 && xScale(point.x) <= 100)
          assert.ok(yScale(point.y) >= 0 && yScale(point.y) <= 100)
        }
      }
    }
  })
})

describe('shared numeric chart scales', () => {
  it('pads observed ranges and maps both normal and reversed axes', () => {
    const domain = numericDomain([-10, 0, 20])
    assert.ok(domain[0] < -10 && domain[1] > 20)
    const scale = linearScale(domain, [0, 100])
    assert.equal(scale(domain[0]), 0)
    assert.equal(scale(domain[1]), 100)
    assert.ok(scale(-10) < scale(0) && scale(0) < scale(20))
    const reversed = linearScale(domain, [100, 0])
    assert.equal(reversed(domain[0]), 100)
    assert.equal(reversed(domain[1]), 0)
  })

  it('gives empty and constant series a usable domain', () => {
    assert.deepEqual(numericDomain([]), [0, 1])
    assert.deepEqual(numericDomain([NaN, Infinity]), [0, 1])
    assert.deepEqual(numericDomain([0, 0]), [-1, 1])
    const domain = numericDomain([5, 5])
    assert.ok(domain[0] < 5 && domain[1] > 5)
    assert.ok(Math.abs(linearScale(domain, [0, 100])(5) - 50) < 1e-10)
    assert.equal(linearScale([5, 5], [0, 100])(5), 50)
  })

  it('keeps domains, ticks, and projected positions finite at numeric extremes', () => {
    for (const values of [[Number.MAX_VALUE], [-Number.MAX_VALUE, Number.MAX_VALUE], [Number.MIN_VALUE], [-Number.MIN_VALUE]]) {
      const domain = numericDomain(values)
      assert.ok(domain.every(Number.isFinite))
      assert.ok(domain[0] < domain[1])
      const ticks = numericTicks(domain)
      assert.ok(ticks.length >= 2 && ticks.length <= 5)
      assert.equal(new Set(ticks).size, ticks.length)
      assert.ok(ticks.every(Number.isFinite))
      for (const value of values) assert.ok(Number.isFinite(linearScale(domain, [0, 100])(value)))
    }
  })

  it('distinguishes close tick values in ordinary and scientific notation', () => {
    for (const values of [[10.00001, 10.00002], [1e100, 1.000000001e100], [1e-100, 1.000000001e-100], [1, 1 + Number.EPSILON]]) {
      const ticks = numericTicks(numericDomain(values))
      assert.equal(new Set(formatTicks(ticks)).size, ticks.length)
    }
    assert.deepEqual(formatTicks([0, 5, 10]), ['0', '5', '10'])
    assert.deepEqual(formatTicks([-0, 0]), ['0', '0'])
  })
})

describe('chart workspace integration', () => {
  it('uses shared search and filters without changing selections or chart axes', () => {
    const repository = createExperimentRepository(experimentFixture())
    const properties = repository.getProperties()
    let state = createWorkspaceState(properties)
    state = workspaceReducer(state, { type: 'chart-axis', axis: 'x', propertyId: 'inputs:Additive' })
    state = workspaceReducer(state, { type: 'chart-axis', axis: 'y', propertyId: 'outputs:Strength' })
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_C' })
    state = workspaceReducer(state, { type: 'view', view: 'charts' })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'inputs:Additive', operator: 'gt', value: 0 } })
    state = workspaceReducer(state, { type: 'search', value: 'EXP_A' })
    const filtered = repository.list(getWorkspaceQuery(state))
    const data = buildScatterData(filtered.items, properties.find((property) => property.id === state.chart.chartAxes.x)!, properties.find((property) => property.id === state.chart.chartAxes.y)!)
    assert.deepEqual(data.points.map((point) => point.id), ['EXP_A'])
    assert.deepEqual(state.selectedIds, ['EXP_C'])
    const axes = state.chart.chartAxes
    state = workspaceReducer(state, { type: 'view', view: 'compare' })
    state = workspaceReducer(state, { type: 'view', view: 'explore' })
    state = workspaceReducer(state, { type: 'view', view: 'charts' })
    assert.deepEqual(state.chart.chartAxes, axes)
    assert.equal(state.search, 'EXP_A')
    state = workspaceReducer(state, { type: 'reset-query' })
    assert.equal(repository.list(getWorkspaceQuery(state)).matched, 5)
    assert.deepEqual(state.chart.chartAxes, axes)
    assert.deepEqual(state.selectedIds, ['EXP_C'])
  })

  it('swaps axes without mutating previous state or the table configuration', () => {
    const initial = createWorkspaceState(getExperimentRepository().getProperties())
    const swapped = workspaceReducer(initial, { type: 'swap-chart-axes' })
    assert.deepEqual(swapped.chart.chartAxes, { x: initial.chart.chartAxes.y, y: initial.chart.chartAxes.x })
    assert.notDeepEqual(swapped.chart.chartAxes, initial.chart.chartAxes)
    assert.deepEqual(swapped.visibleColumns, initial.visibleColumns)
    assert.deepEqual(swapped.sort, initial.sort)
    assert.deepEqual(workspaceReducer(swapped, { type: 'swap-chart-axes' }).chart.chartAxes, initial.chart.chartAxes)
  })
})
