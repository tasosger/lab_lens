import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { linearScale } from '../src/charts/numericScale.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { buildScatterData } from '../src/features/charts/scatterData.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

describe('scatterplot workspace filters', () => {
  const repository = createExperimentRepository(experimentFixture())
  const properties = repository.getProperties()

  it('uses the same numeric filters as the table and preserves them across axis and view changes', () => {
    let state = createWorkspaceState(properties)
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'inputs:Additive', operator: 'between', min: 0, max: 1 } })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'between', min: 8, max: 12 } })
    const query = getWorkspaceQuery(state)
    const result = repository.list(query)
    assert.deepEqual(result.items.map(item => item.id), ['EXP_B', 'EXP_C'])
    const data = buildScatterData(result.items, properties.find(p => p.id === 'inputs:Additive')!, properties.find(p => p.id === 'outputs:Strength')!)
    assert.deepEqual(data.points.map(point => point.id), ['EXP_B', 'EXP_C'])
    assert.equal(data.omittedCount, 0)
    state = workspaceReducer(state, { type: 'swap-chart-axes' })
    for (const view of ['explore', 'compare', 'charts'] as const) {
      state = workspaceReducer(state, { type: 'view', view })
      assert.deepEqual(getWorkspaceQuery(state), query)
    }
  })

  it('preserves search and selection when clearing filters, and restores the full dataset on reset', () => {
    let state = createWorkspaceState(properties)
    state = workspaceReducer(state, { type: 'search', value: 'EXP_B' })
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_E' })
    state = workspaceReducer(state, { type: 'add-filter', condition: { propertyId: 'outputs:Strength', operator: 'gt', value: 100 } })
    assert.equal(repository.list(getWorkspaceQuery(state)).matched, 0)
    const cleared = workspaceReducer(state, { type: 'clear-filters' })
    assert.deepEqual(repository.list(getWorkspaceQuery(cleared)).items.map(item => item.id), ['EXP_B'])
    assert.deepEqual(cleared.selectedIds, ['EXP_E'])
    assert.equal(repository.list(getWorkspaceQuery(workspaceReducer(state, { type: 'reset-query' }))).matched, 5)
  })
})

describe('numeric scale inversion', () => {
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
