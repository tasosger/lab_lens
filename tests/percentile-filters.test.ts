import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { percentileValue, sortedPropertyValues } from '../src/data/percentiles.ts'
import { queryExperiments, QueryValidationError } from '../src/data/query.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import type { ExperimentQuery, NumericFilter } from '../src/data/types.ts'
import { absoluteRangeWarning, parseFilterInput } from '../src/features/experiments/filterInput.ts'
import { describeFilterExpression } from '../src/features/experiments/filterTree.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

const repository = createExperimentRepository(experimentFixture())
const properties = repository.getProperties()
const ids = (filters: readonly NumericFilter[], rest: Omit<ExperimentQuery, 'filters'> = {}) =>
  repository.list({ ...rest, filters }).items.map(item => item.id)
const percentile = (operator: Exclude<NumericFilter['operator'], 'between'>, value: number): NumericFilter =>
  ({ propertyId: 'outputs:Strength', operator, scale: 'percentile', value })

describe('percentile thresholds', () => {
  it('interpolates across the full property distribution without changing data or dropping zeros', () => {
    const experiments = repository.list().items
    const property = properties.find(item => item.id === 'inputs:Additive')!
    const snapshot = structuredClone(experiments)
    const values = sortedPropertyValues(experiments, property)
    assert.deepEqual(values, [0, 0, 1, 2])
    for (const [p, expected] of [[0, 0], [25, 0], [50, 0.5], [75, 1.25], [100, 2]]) {
      assert.equal(percentileValue(values, p!), expected)
    }
    assert.deepEqual(experiments, snapshot)
    assert.equal(percentileValue([-2, 2, 10, 10], 25), 1)
    assert.equal(percentileValue([0, 100], 12.5), 12.5)
  })

  it('handles empty, single-valued, tied and extreme distributions', () => {
    assert.equal(percentileValue([], 50), undefined)
    for (const p of [0, 25, 50, 75, 100]) {
      assert.equal(percentileValue([7], p), 7)
      assert.equal(percentileValue([7, 7, 7], p), 7)
      assert.ok(Number.isFinite(percentileValue([-Number.MAX_VALUE, Number.MAX_VALUE], p)))
    }
    assert.equal(percentileValue([-Number.MAX_VALUE, Number.MAX_VALUE], 50), 0)
    for (const p of [-1, 101, NaN, Infinity]) assert.equal(percentileValue([1, 2], p), undefined)
  })
})

describe('percentile query conditions', () => {
  it('supports every comparison operator and inclusive intervals, excluding missing values', () => {
    assert.deepEqual(ids([percentile('gte', 75)]), ['EXP_B', 'EXP_C'])
    assert.deepEqual(ids([percentile('gt', 75)]), [])
    assert.deepEqual(ids([percentile('eq', 75)]), ['EXP_B', 'EXP_C'])
    assert.deepEqual(ids([percentile('neq', 75)]), ['EXP_A', 'EXP_E'])
    assert.deepEqual(ids([percentile('lte', 25)]), ['EXP_E'])
    assert.deepEqual(ids([percentile('lt', 50)]), ['EXP_A', 'EXP_E'])
    assert.deepEqual(ids([{ propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', min: 25, max: 75 }]), ['EXP_A', 'EXP_B', 'EXP_C'])
    assert.deepEqual(ids([{ propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', min: 0, max: 100 }]), ['EXP_A', 'EXP_B', 'EXP_C', 'EXP_E'])
    assert.deepEqual(ids([{ propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', min: 75, max: 75 }]), ['EXP_B', 'EXP_C'])
  })

  it('keeps thresholds stable under search, other filters, filter order and sort', () => {
    // P50 of Additive is 0.5. Computing it after the other filter would incorrectly keep EXP_A.
    const median: NumericFilter = { propertyId: 'inputs:Additive', operator: 'lte', scale: 'percentile', value: 50 }
    const positive: NumericFilter = { propertyId: 'inputs:Additive', operator: 'gt', value: 0 }
    assert.deepEqual(ids([median, positive]), [])
    assert.deepEqual(ids([positive, median]), [])
    assert.deepEqual(ids([median], { search: 'EXP_A' }), [])
    assert.deepEqual(ids([median], { sort: { field: 'id', direction: 'desc' } }), ['EXP_D', 'EXP_C'])
  })

  it('mixes percentiles and absolute values in nested AND/OR groups', () => {
    const result = repository.list({ filters: [{ operator: 'and', filters: [
      { operator: 'or', filters: [percentile('gte', 75), { propertyId: 'outputs:Cure Time', operator: 'lte', scale: 'percentile', value: 0 }] },
      { propertyId: 'inputs:Additive', operator: 'neq', value: 0 },
    ] }] })
    assert.deepEqual(result.items.map(item => item.id), ['EXP_B'])
    assert.equal(result.total, 5)
    assert.equal(result.matched, 1)
    assert.deepEqual(ids([{ propertyId: 'outputs:Strength', operator: 'gte', value: 10 }]), ids([{ propertyId: 'outputs:Strength', operator: 'gte', scale: 'absolute', value: 10 }]))
  })

  it('validates all branches even with no matching data or a successful earlier OR branch', () => {
    const invalid = [
      ...[-1, 100.1, NaN, Infinity].map(value => percentile('gte', value)),
      { propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', min: 90, max: 10 },
      { propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', min: 10, max: 101 },
      { propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', min: -1, max: 50 },
      { propertyId: 'outputs:Strength', operator: 'gte', scale: 'invalid', value: 50 },
      { propertyId: 'outputs:Unknown', operator: 'gte', scale: 'percentile', value: 50 },
    ] as NumericFilter[]
    for (const condition of invalid) {
      assert.throws(() => repository.list({ search: 'NO_MATCH', filters: [condition] }), QueryValidationError)
      assert.throws(() => repository.list({ filters: [{ operator: 'or', filters: [percentile('gte', 0), condition] }] }), QueryValidationError)
    }
    const map = new Map(properties.map(property => [property.id, property]))
    assert.deepEqual(queryExperiments([], map, { filters: [percentile('neq', 50)] }), [])
    assert.deepEqual(queryExperiments([repository.getById('EXP_D')!], map, { filters: [percentile('neq', 50)] }), [])
  })
})

describe('percentile filter entry and editing', () => {
  it('turns percentile entry into an applied, editable workspace query with clear labels', () => {
    const parsed = parseFilterInput({ propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', value: '25', max: '75' })
    assert.ok('condition' in parsed)
    let state = workspaceReducer(createWorkspaceState(properties), { type: 'add-filter-group', groupId: 0 })
    state = workspaceReducer(state, { type: 'add-filter', groupId: 1, condition: parsed.condition })
    assert.deepEqual(repository.list(getWorkspaceQuery(state)).items.map(item => item.id), ['EXP_A', 'EXP_B', 'EXP_C'])
    assert.equal(describeFilterExpression(parsed.condition, properties), 'Strength between P25 and P75')
    const edited = workspaceReducer(state, { type: 'update-filter', id: 2, condition: percentile('lte', 25) })
    assert.deepEqual(repository.list(getWorkspaceQuery(edited)).items.map(item => item.id), ['EXP_E'])
    assert.equal(describeFilterExpression(percentile('gte', 75), properties), 'Strength ≥ P75')
    assert.deepEqual(state.filters, [{ id: 1, operator: 'or', filters: [{ id: 2, condition: parsed.condition }] }])
  })

  it('rejects blank, non-finite, out-of-range and reversed entries before applying', () => {
    const base = { propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', value: '25', max: '75' } as const
    for (const changes of [{ value: '' }, { value: ' ' }, { value: 'NaN' }, { value: 'Infinity' }, { value: '-1' },
      { value: '101' }, { max: '' }, { max: 'Infinity' }, { max: '101' }, { max: '10' }]) {
      assert.ok('error' in parseFilterInput({ ...base, ...changes }))
    }
    assert.ok('condition' in parseFilterInput({ ...base, value: '0', max: '100' }))
    assert.ok('condition' in parseFilterInput({ ...base, value: '12.5', max: '87.5' }))
    assert.ok('condition' in parseFilterInput({ ...base, scale: 'absolute', value: '-100', max: '200' }))
  })

  it('identifies invalid percentile fields immediately, even while the other bound is empty', () => {
    const base = { propertyId: 'outputs:Strength', operator: 'between', scale: 'percentile', value: '101', max: '' } as const
    const lower = parseFilterInput(base)
    assert.ok('error' in lower)
    assert.deepEqual(lower.fields, ['value'])
    assert.notEqual(lower.incomplete, true)
    const upper = parseFilterInput({ ...base, value: '25', max: '101' })
    assert.ok('error' in upper)
    assert.deepEqual(upper.fields, ['max'])
    const missing = parseFilterInput({ ...base, value: '25' })
    assert.ok('error' in missing)
    assert.equal(missing.incomplete, true)
    assert.deepEqual(missing.fields, ['max'])
  })
})

describe('absolute range warnings', () => {
  const values = [-2, 2, 10, 10]
  it('warns for absolute thresholds outside the actual range, for every comparison operator', () => {
    for (const operator of ['eq', 'neq', 'lt', 'lte', 'gt', 'gte'] as const) {
      for (const value of [-3, 11]) {
        const condition: NumericFilter = { propertyId: 'outputs:Strength', operator, value }
        assert.match(absoluteRangeWarning(condition, values), /outside the recorded range \(-2 to 10\)/)
        assert.doesNotThrow(() => repository.list({ filters: [condition] }))
      }
      for (const value of [-2, 0, 2, 10]) {
        assert.equal(absoluteRangeWarning({ propertyId: 'outputs:Strength', operator, value }, values), '')
      }
    }
  })

  it('warns only for disjoint intervals, keeping touching, partial, and full overlaps valid', () => {
    for (const [min, max] of [[-10, -3], [11, 20]]) {
      assert.match(absoluteRangeWarning({ propertyId: 'outputs:Strength', operator: 'between', min: min!, max: max! }, values), /Selected interval is outside/)
    }
    for (const [min, max] of [[-10, -2], [10, 20], [-10, 5], [5, 20], [-10, 20], [-2, 10], [0, 0]]) {
      assert.equal(absoluteRangeWarning({ propertyId: 'outputs:Strength', operator: 'between', min: min!, max: max! }, values), '')
    }
  })

  it('uses the chosen property including zeros, excludes missing values, and skips percentiles and empty distributions', () => {
    const condition: NumericFilter = { propertyId: 'inputs:Additive', operator: 'gte', value: 0 }
    const property = properties.find(item => item.id === condition.propertyId)!
    const inputs = sortedPropertyValues(repository.list().items, property)
    assert.equal(absoluteRangeWarning(condition, inputs), '')
    assert.match(absoluteRangeWarning({ ...condition, value: -1 }, inputs), /range \(0 to 2\)/)
    assert.equal(absoluteRangeWarning({ ...condition, value: 50, scale: 'percentile' }, inputs), '')
    assert.equal(absoluteRangeWarning(condition, []), '')
    assert.equal(absoluteRangeWarning(condition, [0]), '')
    assert.match(absoluteRangeWarning({ ...condition, value: 1 }, [0]), /range \(0 to 0\)/)
  })
})
