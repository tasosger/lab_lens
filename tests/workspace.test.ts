import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer, type WorkspaceState } from '../src/features/experiments/workspaceReducer.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import type { PropertyDefinition } from '../src/data/types.ts'
import { experimentFixture } from './fixtures.ts'

const properties: PropertyDefinition[] = [
  { id: 'outputs:Strength', group: 'outputs', name: 'Strength', category: 'measurement' },
  { id: 'inputs:Additive', group: 'inputs', name: 'Additive', category: 'ingredient' },
]
const initial = () => createWorkspaceState(properties)

describe('experiment workspace', () => {
  it('starts with only output columns visible and experiment-name sorting', () => {
    assert.deepEqual(initial().visibleColumns, ['outputs:Strength'])
    assert.deepEqual(initial().sort, { field: 'id', direction: 'asc' })
    assert.deepEqual(createWorkspaceState([]).visibleColumns, [])
  })

  it('allows 100 selections while preserving order and allowing replacement at the limit', () => {
    let state = initial()
    const ids = Array.from({ length: 100 }, (_, index) => `EXP_${index}`)
    for (const id of [...ids, 'OVER_LIMIT']) state = workspaceReducer(state, { type: 'toggle-selection', id })
    assert.deepEqual(state.selectedIds, ids)
    state = workspaceReducer(state, { type: 'toggle-selection', id: ids[0] })
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'REPLACEMENT' })
    assert.deepEqual(state.selectedIds, [...ids.slice(1), 'REPLACEMENT'])
    assert.equal(state.baselineId, ids[1])
  })

  it('preserves selections and open details across filtering, search and query reset', () => {
    let state = workspaceReducer(initial(), { type: 'toggle-selection', id: 'EXP_A' })
    state = workspaceReducer(state, { type: 'open-experiment', id: 'EXP_A' })
    state = workspaceReducer(state, { type: 'search', value: 'EXP_B' })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'neq', value: 0 } })
    state = workspaceReducer(state, { type: 'toggle-column', propertyId: 'inputs:Additive' })
    const reset = workspaceReducer(state, { type: 'reset-query' })
    assert.deepEqual(reset.selectedIds, ['EXP_A'])
    assert.equal(reset.openExperimentId, 'EXP_A')
    assert.deepEqual(reset.visibleColumns, ['outputs:Strength', 'inputs:Additive'])
    assert.equal(reset.search, '')
    assert.deepEqual(reset.filters, [])
  })

  it('resets sorting if the sorted column is hidden, including restoring defaults', () => {
    let state = workspaceReducer(initial(), { type: 'sort', field: 'outputs:Strength' })
    state = workspaceReducer(state, { type: 'toggle-column', propertyId: 'outputs:Strength' })
    assert.deepEqual(state.sort, { field: 'id', direction: 'asc' })
    state = workspaceReducer(state, { type: 'toggle-column', propertyId: 'inputs:Additive' })
    state = workspaceReducer(state, { type: 'sort', field: 'inputs:Additive' })
    state = workspaceReducer(state, { type: 'reset-columns', propertyIds: ['outputs:Strength'] })
    assert.deepEqual(state.sort, { field: 'id', direction: 'asc' })
  })

  it('keeps sorting when an unrelated column is hidden and toggles sort direction', () => {
    let state = workspaceReducer(initial(), { type: 'toggle-column', propertyId: 'inputs:Additive' })
    state = workspaceReducer(state, { type: 'sort', field: 'outputs:Strength' })
    state = workspaceReducer(state, { type: 'sort', field: 'outputs:Strength' })
    state = workspaceReducer(state, { type: 'toggle-column', propertyId: 'inputs:Additive' })
    assert.deepEqual(state.sort, { field: 'outputs:Strength', direction: 'desc' })
  })

  it('removes one of identical conditions using stable IDs', () => {
    const condition = { propertyId: 'outputs:Strength', operator: 'gte', value: 10 } as const
    let state = workspaceReducer(initial(), { type: 'add-filter', condition })
    state = workspaceReducer(state, { type: 'add-filter', condition })
    state = workspaceReducer(state, { type: 'remove-filter', id: 1 })
    assert.equal(state.filters.length, 1)
    assert.equal(state.filters[0].id, 2)
    state = workspaceReducer(state, { type: 'add-filter', condition })
    assert.deepEqual(state.filters.map((filter) => filter.id), [2, 3])
  })

  it('retains conditions when changing match mode and keeps selections hidden by results', () => {
    let state = workspaceReducer(initial(), { type: 'toggle-selection', id: 'EXP_A' })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'gt', value: 10 } })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'inputs:Additive', operator: 'eq', value: 0 } })
    const repository = createExperimentRepository(experimentFixture())
    const result = (current: WorkspaceState) => repository.list(getWorkspaceQuery(current))
    assert.equal(result(state).matched, 0)
    state = workspaceReducer(state, { type: 'filter-mode', mode: 'or' })
    assert.equal(result(state).matched, 2)
    assert.deepEqual(state.selectedIds, ['EXP_A'])
    assert.equal(result(state).items.some((experiment) => experiment.id === 'EXP_A'), false)
    assert.equal(state.filters.length, 2)
  })
})
