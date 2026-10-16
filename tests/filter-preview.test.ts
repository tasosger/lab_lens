import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createExperimentRepository } from '../src/data/repository.ts'
import type { NumericFilter } from '../src/data/types.ts'
import { previewFilterQuery } from '../src/features/experiments/filterPreview.ts'
import { createFilterEditorState, getFilterEditorTree, reduceFilterEditor, filterEditorExpressions, type FilterEditorState } from '../src/features/experiments/filterEditorState.ts'
import type { AppliedFilterGroup } from '../src/features/experiments/filterTree.ts'
import { experimentFixture } from './fixtures.ts'

const repository = createExperimentRepository(experimentFixture())
const strength: NumericFilter = { propertyId: 'outputs:Strength', operator: 'gte', value: 10 }
const present: NumericFilter = { propertyId: 'inputs:Additive', operator: 'neq', value: 0 }
const ids = (query: Parameters<typeof repository.list>[0]) => repository.list(query).items.map(item => item.id)

describe('pending filter previews', () => {
  it('includes existing AND/OR conditions and agrees with applying the change', () => {
    for (const operator of ['and', 'or'] as const) {
      const state = createFilterEditorState([{ operator, filters: [strength] }])
      const group = getFilterEditorTree(state)
      const snapshot = structuredClone(group)
      const preview = previewFilterQuery(group, { kind: 'add', id: 0 }, present)
      assert.deepEqual(ids(preview), operator === 'and' ? ['EXP_B'] : ['EXP_A', 'EXP_B', 'EXP_C'])
      const saved: FilterEditorState = reduceFilterEditor(state, { type: 'add-filter', condition: present })
      assert.deepEqual(ids(preview), ids({ filters: filterEditorExpressions(saved) }))
      assert.deepEqual(group, snapshot)
    }
  })

  it('adds to and edits the intended nested group without losing surrounding conditions', () => {
    const group: AppliedFilterGroup = { id: 0, operator: 'and', filters: [
      { id: 1, condition: strength },
      { id: 2, operator: 'or', filters: [{ id: 3, condition: present }] },
    ] }
    const zero: NumericFilter = { propertyId: 'inputs:Additive', operator: 'eq', value: 0 }
    assert.deepEqual(ids(previewFilterQuery(group, { kind: 'add', id: 2 }, zero)), ['EXP_B', 'EXP_C'])
    assert.deepEqual(ids(previewFilterQuery(group, { kind: 'edit', id: 3 }, zero)), ['EXP_C'])
    assert.deepEqual(ids(previewFilterQuery(group, { kind: 'edit', id: 3 }, zero, 'EXP_B')), [])
  })

  it('respects search without rebasing percentile thresholds onto the search results', () => {
    const group: AppliedFilterGroup = { id: 0, operator: 'and', filters: [] }
    const condition: NumericFilter = { propertyId: 'outputs:Strength', operator: 'gte', scale: 'percentile', value: 50 }
    assert.deepEqual(ids(previewFilterQuery(group, { kind: 'add', id: 0 }, condition)), ['EXP_B', 'EXP_C'])
    assert.deepEqual(ids(previewFilterQuery(group, { kind: 'add', id: 0 }, condition, 'EXP_A')), [])
    assert.deepEqual(ids(previewFilterQuery(group, { kind: 'add', id: 0 }, condition, 'EXP_C')), ['EXP_C'])
  })
})
