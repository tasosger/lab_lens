import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createExperimentRepository } from '../src/data/repository.ts'
import type { NumericFilter } from '../src/data/types.ts'
import {
  countConditions,
  describeFilterExpression,
  isAppliedGroup,
} from '../src/features/experiments/filterTree.ts'
import {
  createWorkspaceState,
  getFilterTree,
  getWorkspaceQuery,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceState,
} from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

const repository = createExperimentRepository(experimentFixture())
const properties = repository.getProperties()
const strength: NumericFilter = { propertyId: 'outputs:Strength', operator: 'gte', value: 10 }
const cure: NumericFilter = { propertyId: 'outputs:Cure Time', operator: 'lte', value: 0 }
const additive: NumericFilter = { propertyId: 'inputs:Additive', operator: 'neq', value: 0 }

function apply(...actions: WorkspaceAction[]): WorkspaceState {
  return actions.reduce(workspaceReducer, createWorkspaceState(properties))
}

function ids(state: WorkspaceState) {
  return repository.list(getWorkspaceQuery(state)).items.map((experiment) => experiment.id)
}

function mixedFilters() {
  return apply(
    { type: 'add-filter-group', groupId: 0 }, // Group 1: OR inside root AND.
    { type: 'add-filter', groupId: 1, condition: strength },
    { type: 'add-filter', groupId: 1, condition: cure },
    { type: 'add-filter', condition: additive },
  )
}

describe('workspace filter groups and data API integration', () => {
  it('preserves parentheses: (A OR B) AND C differs from A OR (B AND C)', () => {
    const first = mixedFilters()
    const second = apply(
      { type: 'filter-mode', mode: 'or' },
      { type: 'add-filter', condition: strength },
      { type: 'add-filter-group', groupId: 0 }, // Group 2: AND inside root OR.
      { type: 'add-filter', groupId: 2, condition: cure },
      { type: 'add-filter', groupId: 2, condition: additive },
    )
    assert.deepEqual(ids(first), ['EXP_B'])
    assert.deepEqual(ids(second), ['EXP_B', 'EXP_C'])
    assert.equal(countConditions(getFilterTree(first)), 3)
    assert.equal(describeFilterExpression(getWorkspaceQuery(first).filters![0], properties),
      '((Strength ≥ 10 OR Cure Time ≤ 0) AND Additive ≠ 0)')
  })

  it('combines sibling OR groups under AND without flattening them', () => {
    const state = apply(
      { type: 'add-filter-group', groupId: 0 },
      { type: 'add-filter', groupId: 1, condition: strength },
      { type: 'add-filter', groupId: 1, condition: cure },
      { type: 'add-filter-group', groupId: 0 },
      { type: 'add-filter', groupId: 4, condition: additive },
      { type: 'add-filter', groupId: 4, condition: {
        propertyId: 'outputs:Strength', operator: 'lt', value: 0,
      } },
    )
    assert.deepEqual(ids(state), ['EXP_B'])
  })

  it('supports three levels of mixed groups with missing properties and zero values', () => {
    const state = apply(
      { type: 'add-filter-group', groupId: 0 },
      { type: 'add-filter', groupId: 1, condition: {
        propertyId: 'outputs:Strength', operator: 'lt', value: 0,
      } },
      { type: 'add-filter-group', groupId: 1 },
      { type: 'add-filter', groupId: 3, condition: strength },
      { type: 'add-filter', groupId: 3, condition: {
        propertyId: 'inputs:Additive', operator: 'eq', value: 0,
      } },
      { type: 'add-filter', condition: {
        propertyId: 'inputs:Oven Temperature', operator: 'lte', value: 400,
      } },
    )
    assert.deepEqual(ids(state), ['EXP_C'])
    assert.deepEqual(ids(workspaceReducer(state, { type: 'filter-mode', mode: 'or' })),
      ['EXP_C', 'EXP_E'])
  })

  it('changes only the chosen group mode and never mutates the previous query state', () => {
    const before = mixedFilters()
    const snapshot = structuredClone(before)
    const after = workspaceReducer(before, { type: 'filter-mode', groupId: 1, mode: 'and' })
    assert.deepEqual(ids(after), [])
    assert.equal(after.filterMode, 'and')
    assert.deepEqual(before, snapshot)
    assert.deepEqual(ids(before), ['EXP_B'])
    assert.equal(countConditions(getFilterTree(after)), 3)
  })

  for (const mode of ['and', 'or'] as const) {
    it(`ignores empty draft groups under ${mode.toUpperCase()} instead of sending invalid API groups`, () => {
      let state = apply(
        { type: 'filter-mode', mode },
        { type: 'add-filter-group', groupId: 0 },
        { type: 'add-filter-group', groupId: 1 },
      )
      assert.deepEqual(getWorkspaceQuery(state).filters, [])
      assert.equal(ids(state).length, 5)
      state = workspaceReducer(state, { type: 'add-filter', groupId: 2, condition: strength })
      assert.deepEqual(ids(state), ['EXP_B', 'EXP_C'])
      state = workspaceReducer(state, { type: 'remove-filter', id: 3 })
      assert.deepEqual(getWorkspaceQuery(state).filters, [])
      state = workspaceReducer(state, { type: 'add-filter', condition: additive })
      assert.deepEqual(ids(state), ['EXP_A', 'EXP_B'])
    })
  }

  it('removes a condition at its own depth, and removes entire group subtrees', () => {
    const original = mixedFilters()
    const withoutCure = workspaceReducer(original, { type: 'remove-filter', id: 3 })
    assert.equal(countConditions(getFilterTree(withoutCure)), 2)
    assert.deepEqual(ids(withoutCure), ['EXP_B'])
    const withoutGroup = workspaceReducer(original, { type: 'remove-filter', id: 1 })
    assert.equal(countConditions(getFilterTree(withoutGroup)), 1)
    assert.deepEqual(ids(withoutGroup), ['EXP_A', 'EXP_B'])
    const next = workspaceReducer(withoutGroup, { type: 'add-filter-group', groupId: 0 })
    assert.deepEqual(next.filters.map((node) => node.id), [4, 5])
    assert.equal(countConditions(getFilterTree(original)), 3)
  })

  it('removes only the chosen instance when identical conditions appear in different groups', () => {
    const original = apply(
      { type: 'add-filter', condition: strength },
      { type: 'add-filter-group', groupId: 0 },
      { type: 'add-filter', groupId: 2, condition: strength },
    )
    const state = workspaceReducer(original, { type: 'remove-filter', id: 3 })
    assert.equal(countConditions(getFilterTree(state)), 1)
    const rootCondition = state.filters[0]
    assert.ok(!isAppliedGroup(rootCondition))
    assert.deepEqual(rootCondition.condition, strength)
    assert.deepEqual(ids(state), ['EXP_B', 'EXP_C'])
  })

  it('keeps search, sort and selection behavior when querying or clearing nested groups', () => {
    let state = workspaceReducer(mixedFilters(), { type: 'remove-filter', id: 4 })
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_A' })
    state = workspaceReducer(state, { type: 'sort', field: 'outputs:Cure Time' })
    assert.deepEqual(ids(state), ['EXP_D', 'EXP_C', 'EXP_B'])
    state = workspaceReducer(state, { type: 'search', value: ' exp_c ' })
    assert.deepEqual(ids(state), ['EXP_C'])
    const cleared = workspaceReducer(state, { type: 'clear-filters' })
    assert.deepEqual(getWorkspaceQuery(cleared).filters, [])
    assert.deepEqual(ids(cleared), ['EXP_C'])
    assert.deepEqual(cleared.selectedIds, ['EXP_A'])
    const reset = workspaceReducer(state, { type: 'reset-query' })
    assert.equal(ids(reset).length, 5)
    assert.deepEqual(reset.selectedIds, ['EXP_A'])
  })

  it('ignores actions targeting a group that has already been removed', () => {
    const state = workspaceReducer(mixedFilters(), { type: 'remove-filter', id: 1 })
    assert.equal(workspaceReducer(state, { type: 'add-filter', groupId: 1, condition: cure }), state)
    assert.equal(workspaceReducer(state, { type: 'add-filter-group', groupId: 1 }), state)
  })
})
