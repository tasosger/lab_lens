import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createExperimentRepository } from '../src/data/repository.ts'
import { createFilterDraft, reduceFilterDraft, type FilterDraft } from '../src/features/experiments/filterDraft.ts'
import { parseFilterInput } from '../src/features/experiments/filterInput.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

const repository = createExperimentRepository(experimentFixture())
function condition(draft: FilterDraft) {
  const parsed = parseFilterInput({ propertyId: draft.propertyId, operator: draft.operator, scale: draft.scale, ...draft.thresholds })
  assert.ok('condition' in parsed)
  return parsed.condition
}

describe('filter editing workflow', () => {
  it('starts with an empty absolute value and applies the typed number in the chosen units', () => {
    const initial = createFilterDraft('outputs:Strength')
    assert.equal(initial.scale, 'absolute')
    assert.deepEqual(initial.thresholds, { value: '', max: '' })
    const typed = reduceFilterDraft(initial, { type: 'threshold', field: 'value', value: '75' })
    assert.deepEqual(repository.list({ filters: [condition(typed)] }).items.map(item => item.id), [])
    const percentile = reduceFilterDraft(typed, { type: 'scale', scale: 'percentile' })
    assert.deepEqual(repository.list({ filters: [condition(percentile)] }).items.map(item => item.id), ['EXP_B', 'EXP_C'])
    assert.deepEqual(initial, createFilterDraft('outputs:Strength'))
  })

  it('preserves typed thresholds when switching between percentile and absolute units', () => {
    let draft = createFilterDraft('outputs:Strength', { propertyId: 'outputs:Strength', operator: 'between', min: -2, max: 10 })
    const snapshot = structuredClone(draft)
    draft = reduceFilterDraft(draft, { type: 'scale', scale: 'percentile' })
    assert.deepEqual(draft.thresholds, { value: '-2', max: '10' })
    assert.ok('error' in parseFilterInput({ ...draft, ...draft.thresholds }))
    draft = reduceFilterDraft(draft, { type: 'threshold', field: 'value', value: '12.5' })
    draft = reduceFilterDraft(draft, { type: 'threshold', field: 'max', value: '87.5' })
    draft = reduceFilterDraft(draft, { type: 'scale', scale: 'absolute' })
    assert.deepEqual(draft.thresholds, { value: '12.5', max: '87.5' })
    draft = reduceFilterDraft(draft, { type: 'threshold', field: 'value', value: '0' })
    draft = reduceFilterDraft(draft, { type: 'scale', scale: 'percentile' })
    assert.deepEqual(draft.thresholds, { value: '0', max: '87.5' })
    assert.deepEqual(snapshot.thresholds, { value: '-2', max: '10' })
  })

  it('edits an existing nested condition while retaining the rest of the query', () => {
    const properties = repository.getProperties()
    let state = workspaceReducer(createWorkspaceState(properties), { type: 'add-filter-group', groupId: 0 })
    state = workspaceReducer(state, { type: 'add-filter', groupId: 1, condition: { propertyId: 'outputs:Strength', operator: 'gte', value: 10 } })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'inputs:Additive', operator: 'neq', value: 0 } })
    const snapshot = structuredClone(state)
    let draft = createFilterDraft('outputs:Strength')
    draft = reduceFilterDraft(draft, { type: 'scale', scale: 'percentile' })
    draft = reduceFilterDraft(draft, { type: 'operator', operator: 'between' })
    draft = reduceFilterDraft(draft, { type: 'threshold', field: 'value', value: '25' })
    draft = reduceFilterDraft(draft, { type: 'threshold', field: 'max', value: '75' })
    // A draft does not affect the query until Save changes dispatches an update.
    assert.deepEqual(state, snapshot)
    assert.deepEqual(repository.list(getWorkspaceQuery(state)).items.map(item => item.id), ['EXP_B'])
    state = workspaceReducer(state, { type: 'update-filter', id: 2, condition: condition(draft) })
    assert.deepEqual(repository.list(getWorkspaceQuery(state)).items.map(item => item.id), ['EXP_A', 'EXP_B'])
    assert.deepEqual(state.filters[1], snapshot.filters[1])
  })

  it('restores every operator and full-precision value, including zero', () => {
    for (const operator of ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'] as const) {
      for (const scale of ['absolute', 'percentile'] as const) {
        for (const value of [0, 12.3456789012345, 100]) {
          const original = { propertyId: 'inputs:Additive' as const, operator, scale, value }
          assert.deepEqual(condition(createFilterDraft('', original)), original)
        }
      }
    }
  })
})
