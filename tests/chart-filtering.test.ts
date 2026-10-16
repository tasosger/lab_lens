import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { linearScale } from '../src/charts/numericScale.ts'
import { parseRangeInput, rangeToInput } from '../src/charts/rangeInput.ts'
import { clampToPlot, isRangeDrag, rangeToRectangle, rectangleToRange, selectionRectangle } from '../src/charts/rangeSelection.ts'
import type { CartesianLayout, CartesianRange } from '../src/charts/types.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { propertyRangeConditions, rangeForAxes, type PropertyRangeFilter } from '../src/features/charts/propertyRangeFilter.ts'
import { buildScatterData } from '../src/features/charts/scatterData.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer, type WorkspaceState } from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

const layout: CartesianLayout = {
  width: 500, height: 400, left: 80, right: 480, top: 20, bottom: 320,
  xScale: linearScale([-10, 10], [80, 480]), yScale: linearScale([0, 30], [320, 20]),
}

describe('Cartesian range geometry', () => {
  it('converts any drag direction into the same inclusive numeric ranges with an inverted Y axis', () => {
    const range: CartesianRange = { x: [-5, 5], y: [10, 20] }
    for (const [start, end] of [
      [{ x: 180, y: 120 }, { x: 380, y: 220 }],
      [{ x: 380, y: 220 }, { x: 180, y: 120 }],
      [{ x: 180, y: 220 }, { x: 380, y: 120 }],
      [{ x: 380, y: 120 }, { x: 180, y: 220 }],
    ]) {
      const rectangle = selectionRectangle(start!, end!)
      assert.ok(isRangeDrag(rectangle))
      assert.deepEqual(rectangleToRange(rectangle, layout), range)
      assert.deepEqual(rangeToRectangle(range, layout), rectangle)
    }
  })

  it('clamps captured pointers that leave the plot and ignores clicks or thin gestures', () => {
    assert.deepEqual(clampToPlot({ x: -100, y: 900 }, layout), { x: 80, y: 320 })
    assert.deepEqual(clampToPlot({ x: 900, y: -100 }, layout), { x: 480, y: 20 })
    for (const end of [{ x: 10, y: 10 }, { x: 12, y: 100 }, { x: 100, y: 12 }]) {
      assert.equal(isRangeDrag(selectionRectangle({ x: 10, y: 10 }, end)), false)
    }
  })

  it('clips saved ranges to the plot and hides disjoint rectangles', () => {
    assert.deepEqual(rangeToRectangle({ x: [-100, 100], y: [-100, 100] }, layout),
      { left: 80, right: 480, top: 20, bottom: 320 })
    assert.equal(rangeToRectangle({ x: [50, 100], y: [0, 20] }, layout), null)
    assert.deepEqual(rangeToRectangle({ x: [0, 0], y: [0, 0] }, layout),
      { left: 280, right: 280, top: 320, bottom: 320 })
  })

  it('inverts normal, reversed, constant and extreme numeric scales without overflow', () => {
    for (const range of [[0, 100], [100, 0]] as const) {
      for (const domain of [[-100, 100], [-Number.MAX_VALUE, Number.MAX_VALUE], [5, 5]] as const) {
        const scale = linearScale(domain, range)
        for (const value of [domain[0], domain[0] / 2 + domain[1] / 2, domain[1]]) {
          assert.equal(scale.invert(scale(value)), value)
          assert.ok(Number.isFinite(scale.invert(scale(value))))
        }
      }
    }
    assert.equal(linearScale([-10, 10], [0, 0]).invert(0), 0)
  })
})

describe('precise range entry', () => {
  it('preserves zero, negative bounds, equality and full precision', () => {
    const range: CartesianRange = { x: [-2.34567890123456, 0], y: [10, 10] }
    assert.deepEqual(parseRangeInput(rangeToInput(range)), range)
  })

  it('rejects blanks, nonfinite values and reversed ranges before applying a query', () => {
    const valid = { xMin: '0', xMax: '1', yMin: '2', yMax: '3' }
    for (const value of ['', ' ', 'Infinity', '-Infinity', 'NaN', 'not a number']) {
      for (const key of Object.keys(valid)) assert.equal(parseRangeInput({ ...valid, [key]: value }), null)
    }
    assert.equal(parseRangeInput({ ...valid, xMin: '2' }), null)
    assert.equal(parseRangeInput({ ...valid, yMax: '1' }), null)
  })
})

describe('plot filters and workspace integration', () => {
  const repository = createExperimentRepository(experimentFixture())
  const properties = repository.getProperties()
  const filter: PropertyRangeFilter = {
    xPropertyId: 'inputs:Additive', yPropertyId: 'outputs:Strength', range: { x: [0, 1], y: [8, 12] },
  }
  const initial = () => createWorkspaceState(properties)
  const apply = (state: WorkspaceState, next: PropertyRangeFilter | null = filter) =>
    workspaceReducer(state, { type: 'set-plot-filter', filter: next })
  const ids = (state: WorkspaceState, includePlotFilter = true) =>
    repository.list(getWorkspaceQuery(state, { includePlotFilter })).items.map((experiment) => experiment.id)

  it('ANDs both axis ranges with an existing OR group without changing that group', () => {
    let before = workspaceReducer(initial(), { type: 'filter-mode', mode: 'or' })
    before = workspaceReducer(before, { type: 'add-filter', condition: { propertyId: 'inputs:Additive', operator: 'eq', value: 2 } })
    before = workspaceReducer(before, { type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'gte', value: 10 } })
    const snapshot = structuredClone(before)
    const after = apply(before)
    assert.deepEqual(ids(before), ['EXP_A', 'EXP_B', 'EXP_C'])
    assert.deepEqual(ids(after), ['EXP_B', 'EXP_C'])
    assert.deepEqual(ids(after, false), ids(before))
    assert.deepEqual(before, snapshot)
    assert.deepEqual(after.filters, before.filters)
    assert.equal(after.filterMode, 'or')
  })

  it('replaces the plot range and clears it independently of manual filters and search', () => {
    let state = workspaceReducer(initial(), { type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'gte', value: 0 } })
    state = workspaceReducer(state, { type: 'search', value: 'exp_' })
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_E' })
    state = apply(state)
    assert.deepEqual(ids(state), ['EXP_B', 'EXP_C'])
    state = apply(state, { ...filter, range: { x: [1, 2], y: [0, 3] } })
    assert.deepEqual(ids(state), ['EXP_A'])
    const cleared = apply(state, null)
    assert.deepEqual(ids(cleared), ['EXP_A', 'EXP_B', 'EXP_C'])
    assert.equal(cleared.search, 'exp_')
    assert.deepEqual(cleared.selectedIds, ['EXP_E'])
    assert.equal(cleared.filters.length, 1)
    assert.equal(cleared.nextFilterId, 2)
  })

  it('retains source data for redrawing a range even when no experiments match', () => {
    const state = apply(initial(), { ...filter, range: { x: [100, 200], y: [100, 200] } })
    assert.deepEqual(ids(state), [])
    assert.equal(ids(state, false).length, 5)
    const context = repository.list(getWorkspaceQuery(state, { includePlotFilter: false })).items
    const data = buildScatterData(context, properties.find(p => p.id === filter.xPropertyId)!, properties.find(p => p.id === filter.yPropertyId)!)
    assert.equal(data.points.length, 3)
    assert.equal(data.omittedCount, 2)
  })

  it('preserves property bindings across swaps, unrelated axes and view changes', () => {
    let state = apply(initial())
    state = workspaceReducer(state, { type: 'chart-axis', axis: 'x', propertyId: filter.xPropertyId })
    state = workspaceReducer(state, { type: 'chart-axis', axis: 'y', propertyId: filter.yPropertyId })
    assert.deepEqual(rangeForAxes(state.plotFilter, state.chartAxes), filter.range)
    state = workspaceReducer(state, { type: 'swap-chart-axes' })
    assert.deepEqual(rangeForAxes(state.plotFilter, state.chartAxes), { x: filter.range.y, y: filter.range.x })
    state = workspaceReducer(state, { type: 'chart-axis', axis: 'x', propertyId: 'outputs:Cure Time' })
    assert.equal(rangeForAxes(state.plotFilter, state.chartAxes), null)
    for (const view of ['explore', 'compare', 'charts'] as const) {
      state = workspaceReducer(state, { type: 'view', view })
      assert.deepEqual(ids(state), ['EXP_B', 'EXP_C'])
    }
  })

  it('intersects two ranges on the same property and treats zero as data, not missing', () => {
    const same = { ...filter, yPropertyId: filter.xPropertyId, range: { x: [0, 1], y: [1, 2] } } satisfies PropertyRangeFilter
    assert.deepEqual(ids(apply(initial(), same)), ['EXP_B'])
    assert.deepEqual(ids(apply(initial(), { ...filter, range: { x: [0, 0], y: [10, 10] } })), ['EXP_C'])
    assert.equal(propertyRangeConditions(null).length, 0)
  })

  it('clears plot filters with global resets and refuses invalid ranges', () => {
    const state = apply(workspaceReducer(initial(), { type: 'search', value: 'EXP_B' }))
    const cleared = workspaceReducer(state, { type: 'clear-filters' })
    assert.equal(cleared.plotFilter, null)
    assert.deepEqual(ids(cleared), ['EXP_B'])
    const reset = workspaceReducer(state, { type: 'reset-query' })
    assert.equal(reset.plotFilter, null)
    assert.equal(ids(reset).length, 5)
    for (const x of [[1, 0], [NaN, 1], [0, Infinity]] as const) {
      assert.equal(apply(state, { ...filter, range: { ...filter.range, x } }), state)
    }
  })

  it('filters the supplied dataset to the same seven experiments as the plotted bounds', () => {
    const real = getExperimentRepository()
    const state = apply(createWorkspaceState(real.getProperties()), {
      xPropertyId: 'outputs:Viscosity', yPropertyId: 'outputs:Tensile Strength',
      range: { x: [2300, 2600], y: [13, 15] },
    })
    const result = real.list(getWorkspaceQuery(state))
    assert.equal(result.matched, 7)
    assert.equal(real.list(getWorkspaceQuery(state, { includePlotFilter: false })).matched, 25)
    assert.ok(result.items.every(experiment => experiment.outputs.Viscosity! >= 2300
      && experiment.outputs.Viscosity! <= 2600 && experiment.outputs['Tensile Strength']! >= 13
      && experiment.outputs['Tensile Strength']! <= 15))
  })
})
