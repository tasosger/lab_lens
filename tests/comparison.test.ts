import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareExperiments } from '../src/data/index.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import {
  createWorkspaceState,
  getWorkspaceQuery,
  workspaceReducer,
} from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

const repository = createExperimentRepository(experimentFixture())
const properties = repository.getProperties()
const records = (...ids: string[]) => ids.map((id) => repository.getById(id)!)

describe('experiment comparison', () => {
  it('preserves selection and property order and uses the first selection as the initial baseline', () => {
    const result = compareExperiments(records('EXP_C', 'EXP_A', 'EXP_B'), properties)
    assert.equal(result.baselineId, 'EXP_C')
    assert.deepEqual(result.rows.map((row) => row.property.id), properties.map((property) => property.id))
    const row = result.rows.find((row) => row.property.id === 'outputs:Strength')!
    assert.deepEqual(row.values, [
      { experimentId: 'EXP_C', value: 10, delta: 0 },
      { experimentId: 'EXP_A', value: 2, delta: -8 },
      { experimentId: 'EXP_B', value: 10, delta: 0 },
    ])
    assert.equal(row.differs, true)
  })

  it('changes deltas when the baseline changes without reordering columns or changing differing rows', () => {
    const experiments = records('EXP_A', 'EXP_B')
    const first = compareExperiments(experiments, properties, 'EXP_A')
    const second = compareExperiments(experiments, properties, 'EXP_B')
    const strength = second.rows.find((row) => row.property.id === 'outputs:Strength')!
    assert.deepEqual(strength.values.map((cell) => cell.delta), [-8, 0])
    const additive = second.rows.find((row) => row.property.id === 'inputs:Additive')!
    assert.deepEqual(additive.values.map((cell) => cell.delta), [1, 0])
    assert.deepEqual(first.rows.map((row) => row.differs), second.rows.map((row) => row.differs))
    assert.equal(compareExperiments(experiments, properties, 'missing').baselineId, 'EXP_A')
  })

  it('treats zero as a value and missing values as distinct, with unavailable deltas', () => {
    const comparison = compareExperiments(records('EXP_C', 'EXP_D', 'EXP_E'), properties)
    const additive = comparison.rows.find((row) => row.property.id === 'inputs:Additive')!
    assert.deepEqual(additive.values.map((cell) => [cell.value, cell.delta]), [[0, 0], [0, 0], [undefined, undefined]])
    assert.equal(additive.differs, true)
    const missingBaseline = compareExperiments(records('EXP_D', 'EXP_C'), properties)
      .rows.find((row) => row.property.id === 'outputs:Strength')!
    assert.deepEqual(missingBaseline.values.map((cell) => cell.delta), [undefined, undefined])
    assert.equal(missingBaseline.differs, true)
  })

  it('identifies equal and all-missing rows without hiding differences between other columns', () => {
    const equal = compareExperiments(records('EXP_B', 'EXP_C'), properties)
      .rows.find((row) => row.property.id === 'outputs:Strength')!
    assert.equal(equal.differs, false)
    const missing = compareExperiments(records('EXP_A', 'EXP_D'), properties)
      .rows.find((row) => row.property.id === 'outputs:Later Property')!
    assert.equal(missing.differs, false)
    const mixed = compareExperiments(records('EXP_B', 'EXP_C', 'EXP_A'), properties)
      .rows.find((row) => row.property.id === 'outputs:Strength')!
    assert.equal(mixed.differs, true)
  })

  it('compares source precision and handles negative values, signed zero and delta overflow', () => {
    const source = createExperimentRepository({
      A: { inputs: { Precise: 1, Zero: -0, Negative: -3, Huge: -Number.MAX_VALUE }, outputs: {} },
      B: { inputs: { Precise: 1 + 1e-12, Zero: 0, Negative: -2, Huge: Number.MAX_VALUE }, outputs: {} },
    })
    const rows = new Map(compareExperiments(source.list().items, source.getProperties()).rows
      .map((row) => [row.property.name, row]))
    assert.equal(rows.get('Precise')!.differs, true)
    assert.ok(rows.get('Precise')!.values[1].delta! > 0)
    assert.equal(rows.get('Zero')!.differs, false)
    assert.equal(rows.get('Zero')!.values[0].delta, 0)
    assert.equal(rows.get('Negative')!.values[1].delta, 1)
    assert.equal(rows.get('Huge')!.values[1].delta, undefined)
    assert.equal(rows.get('Huge')!.values[1].value, Number.MAX_VALUE)
  })

  it('handles empty and single selections and cannot mutate the source data', () => {
    assert.deepEqual(compareExperiments([], properties), { baselineId: null, rows: [] })
    const comparison = compareExperiments(records('EXP_A'), properties)
    assert.ok(comparison.rows.every((row) => !row.differs))
    assert.equal(comparison.baselineId, 'EXP_A')
    assert.ok(Object.isFrozen(comparison))
    assert.ok(Object.isFrozen(comparison.rows))
    assert.ok(comparison.rows.every((row) => Object.isFrozen(row) && Object.isFrozen(row.values)))
    assert.equal(Reflect.set(comparison.rows[0].values[0], 'value', 999), false)
    assert.equal(repository.getById('EXP_A')!.outputs.Strength, 2)
  })
})

describe('comparison workspace state', () => {
  it('selects the initial baseline and falls back to the first remaining selection when it is removed', () => {
    let state = createWorkspaceState(properties)
    for (const id of ['EXP_A', 'EXP_B', 'EXP_C']) state = workspaceReducer(state, { type: 'toggle-selection', id })
    assert.equal(state.baselineId, 'EXP_A')
    state = workspaceReducer(state, { type: 'baseline', id: 'EXP_C' })
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_B' })
    assert.equal(state.baselineId, 'EXP_C')
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_C' })
    assert.equal(state.baselineId, 'EXP_A')
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_A' })
    assert.equal(state.baselineId, null)
  })

  it('preserves Explore controls, selection and comparison preferences across navigation', () => {
    let state = createWorkspaceState(properties)
    for (const id of ['EXP_B', 'EXP_C']) state = workspaceReducer(state, { type: 'toggle-selection', id })
    state = workspaceReducer(state, { type: 'search', value: 'EXP_A' })
    state = workspaceReducer(state, { type: 'add-filter', condition: {
      propertyId: 'inputs:Additive', operator: 'gt', value: 0,
    } })
    state = workspaceReducer(state, { type: 'sort', field: 'outputs:Strength' })
    state = workspaceReducer(state, { type: 'toggle-column', propertyId: 'inputs:Additive' })
    state = workspaceReducer(state, { type: 'baseline', id: 'EXP_C' })
    state = workspaceReducer(state, { type: 'differences-only', value: true })
    const beforeNavigation = structuredClone(state)
    state = workspaceReducer(state, { type: 'view', view: 'compare' })
    assert.equal(state.activeView, 'compare')
    assert.deepEqual(repository.list(getWorkspaceQuery(state)).items.map((item) => item.id), ['EXP_A'])
    const comparison = compareExperiments(records(...state.selectedIds), properties, state.baselineId)
    assert.deepEqual(comparison.rows[0].values.map((cell) => cell.experimentId), ['EXP_B', 'EXP_C'])
    state = workspaceReducer(state, { type: 'view', view: 'explore' })
    assert.deepEqual(state, beforeNavigation)
  })

  it('rejects an unselected baseline and clears the reference with the selection', () => {
    let state = createWorkspaceState(properties)
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_A' })
    assert.equal(workspaceReducer(state, { type: 'baseline', id: 'EXP_B' }), state)
    state = workspaceReducer(state, { type: 'view', view: 'compare' })
    state = workspaceReducer(state, { type: 'clear-selection' })
    assert.deepEqual(state.selectedIds, [])
    assert.equal(state.baselineId, null)
    assert.equal(state.activeView, 'compare')
  })
})
