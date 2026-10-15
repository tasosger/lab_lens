import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getPropertyValue } from '../src/data/properties.ts'
import { QueryValidationError } from '../src/data/query.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import type { ExperimentQuery, FilterExpression, NumericFilter, PropertyId } from '../src/data/types.ts'
import { experimentFixture } from './fixtures.ts'

const ids = (query: ExperimentQuery = {}) =>
  createExperimentRepository(experimentFixture()).list(query).items.map((item) => item.id)

describe('experiment queries', () => {
  it('defaults to experiment-name order and keeps total and matched counts separate', () => {
    const repository = createExperimentRepository(experimentFixture())
    assert.deepEqual(ids(), ['EXP_A', 'EXP_B', 'EXP_C', 'EXP_D', 'EXP_E'])
    assert.equal(repository.list().total, 5)
    assert.equal(repository.list().matched, 5)
    const result = repository.list({ search: '  eXp_c  ' })
    assert.deepEqual(result.items.map((item) => item.id), ['EXP_C'])
    assert.equal(result.total, 5)
    assert.equal(result.matched, 1)
    assert.equal(repository.list({ search: 'no match' }).matched, 0)
    assert.equal(repository.list({ search: '   ' }).matched, 5)
  })

  it('retrieves exact IDs without applying list filters or inheriting object keys', () => {
    const repository = createExperimentRepository(experimentFixture())
    repository.list({ search: 'EXP_A' })
    assert.equal(repository.getById('EXP_C')?.outputs.Strength, 10)
    assert.equal(repository.getById('exp_c'), undefined)
    assert.equal(repository.getById('missing'), undefined)
    assert.equal(repository.getById('toString'), undefined)
  })

  it('combines search and multiple filters using AND', () => {
    assert.deepEqual(ids({
      search: 'exp_',
      filters: [
        { propertyId: 'outputs:Strength', operator: 'gte', value: 10 },
        { propertyId: 'inputs:Additive', operator: 'eq', value: 0 },
      ],
    }), ['EXP_C'])
    assert.deepEqual(ids({
      search: 'EXP_A',
      filters: [{ propertyId: 'outputs:Strength', operator: 'gte', value: 10 }],
    }), [])
  })

  const operatorCases: { filter: NumericFilter; expected: string[] }[] = [
    { filter: { propertyId: 'inputs:Additive', operator: 'eq', value: 0 }, expected: ['EXP_C', 'EXP_D'] },
    { filter: { propertyId: 'inputs:Additive', operator: 'neq', value: 0 }, expected: ['EXP_A', 'EXP_B'] },
    { filter: { propertyId: 'inputs:Additive', operator: 'gt', value: 1 }, expected: ['EXP_A'] },
    { filter: { propertyId: 'inputs:Additive', operator: 'gte', value: 1 }, expected: ['EXP_A', 'EXP_B'] },
    { filter: { propertyId: 'inputs:Additive', operator: 'lt', value: 1 }, expected: ['EXP_C', 'EXP_D'] },
    { filter: { propertyId: 'inputs:Additive', operator: 'lte', value: 1 }, expected: ['EXP_B', 'EXP_C', 'EXP_D'] },
    { filter: { propertyId: 'inputs:Additive', operator: 'between', min: 0, max: 1 }, expected: ['EXP_B', 'EXP_C', 'EXP_D'] },
  ]

  for (const { filter, expected } of operatorCases) {
    it(`applies ${filter.operator} numerically and excludes missing values`, () => {
      assert.deepEqual(ids({ filters: [filter] }), expected)
    })
  }

  it('supports equal range bounds, negative values, and repeated property conditions', () => {
    assert.deepEqual(ids({
      filters: [{ propertyId: 'inputs:Additive', operator: 'between', min: 0, max: 0 }],
    }), ['EXP_C', 'EXP_D'])
    assert.deepEqual(ids({
      filters: [{ propertyId: 'outputs:Strength', operator: 'lt', value: 0 }],
    }), ['EXP_E'])
    assert.deepEqual(ids({ filters: [
      { propertyId: 'outputs:Strength', operator: 'gte', value: 2 },
      { propertyId: 'outputs:Strength', operator: 'lte', value: 10 },
    ] }), ['EXP_A', 'EXP_B', 'EXP_C'])
  })

  it('matches either OR branch and returns experiments matching both branches only once', () => {
    const repository = createExperimentRepository(experimentFixture())
    const result = repository.list({ filters: [{
      operator: 'or',
      filters: [
        { propertyId: 'outputs:Strength', operator: 'gte', value: 10 },
        { propertyId: 'inputs:Additive', operator: 'eq', value: 0 },
      ],
    }] })
    assert.deepEqual(result.items.map((item) => item.id), ['EXP_B', 'EXP_C', 'EXP_D'])
    assert.equal(result.matched, 3)
    assert.equal(result.total, 5)
  })

  it('combines an OR group with a top-level AND condition and not equal', () => {
    assert.deepEqual(ids({ filters: [
      {
        operator: 'or',
        filters: [
          { propertyId: 'outputs:Strength', operator: 'gte', value: 10 },
          { propertyId: 'outputs:Cure Time', operator: 'lte', value: 0 },
        ],
      },
      { propertyId: 'inputs:Additive', operator: 'neq', value: 0 },
    ] }), ['EXP_B'])
  })

  it('supports AND groups nested inside OR groups and respects search and sorting', () => {
    const filters: readonly FilterExpression[] = [{
      operator: 'or',
      filters: [
        {
          operator: 'and',
          filters: [
            { propertyId: 'outputs:Strength', operator: 'between', min: 2, max: 10 },
            { propertyId: 'inputs:Additive', operator: 'neq', value: 0 },
          ],
        },
        { propertyId: 'outputs:Strength', operator: 'lt', value: 0 },
      ],
    }]
    assert.deepEqual(ids({ filters, sort: { field: 'outputs:Strength', direction: 'desc' } }),
      ['EXP_B', 'EXP_A', 'EXP_E'])
    assert.deepEqual(ids({ filters, search: ' eXp_a ' }), ['EXP_A'])
    assert.deepEqual(ids({ filters, search: 'EXP_C' }), [])
  })

  it('supports OR nested inside AND with deeper logical groups', () => {
    assert.deepEqual(ids({ filters: [{
      operator: 'and',
      filters: [
        {
          operator: 'or',
          filters: [
            { propertyId: 'inputs:Additive', operator: 'eq', value: 1 },
            {
              operator: 'and',
              filters: [
                { propertyId: 'outputs:Strength', operator: 'eq', value: 10 },
                { propertyId: 'inputs:Additive', operator: 'eq', value: 0 },
              ],
            },
          ],
        },
        { propertyId: 'outputs:Cure Time', operator: 'lt', value: 4 },
      ],
    }] }), ['EXP_C'])
  })

  it('matches zero and negative values with not equal, while excluding missing measurements', () => {
    assert.deepEqual(ids({ filters: [
      { propertyId: 'inputs:Additive', operator: 'neq', value: 2 },
    ] }), ['EXP_B', 'EXP_C', 'EXP_D'])
    assert.deepEqual(ids({ filters: [
      { propertyId: 'outputs:Strength', operator: 'neq', value: 10 },
    ] }), ['EXP_A', 'EXP_E'])
  })

  it('returns no matches when every OR branch is false or has a missing measurement', () => {
    assert.deepEqual(ids({ filters: [{
      operator: 'or',
      filters: [
        { propertyId: 'outputs:Strength', operator: 'gt', value: 100 },
        { propertyId: 'inputs:Oven Temperature', operator: 'lt', value: 0 },
      ],
    }] }), [])
  })

  it('accepts an empty top-level filter list but rejects empty or malformed groups', () => {
    assert.deepEqual(ids({ filters: [] }), ids())
    const invalidQueries = [
      { filters: null },
      { filters: {} },
      { filters: [null] },
      { filters: ['invalid'] },
      { filters: [{ operator: 'or', filters: [] }] },
      { filters: [{ operator: 'and', filters: [] }] },
      { filters: [{ operator: 'or' }] },
      { filters: [{ operator: 'or', filters: {} }] },
      { filters: [{ operator: 'xor', filters: [] }] },
    ]
    for (const query of invalidQueries) {
      assert.throws(() => ids(query as unknown as ExperimentQuery), QueryValidationError)
    }
  })

  it('validates every nested branch before evaluating OR or AND', () => {
    const invalidBranches: FilterExpression[] = [
      { propertyId: 'outputs:Unknown', operator: 'eq', value: 0 },
      { propertyId: 'inputs:Additive', operator: 'neq', value: NaN },
      { operator: 'and', filters: [] },
    ]
    for (const operator of ['and', 'or'] as const) {
      for (const invalid of invalidBranches) {
        assert.throws(() => ids({ filters: [{
          operator,
          filters: [
            { propertyId: 'inputs:Additive', operator: 'gte', value: operator === 'or' ? 0 : 999 },
            invalid,
          ],
        }] }), QueryValidationError)
      }
    }
    assert.throws(() => createExperimentRepository({}).list({ filters: [{
      operator: 'or',
      filters: [{ propertyId: 'inputs:Additive', operator: 'neq', value: 0 }],
    }] }), QueryValidationError)
  })

  it('sorts numbers numerically, uses stable ID ties, and keeps missing values last', () => {
    assert.deepEqual(ids({ sort: { field: 'outputs:Strength', direction: 'asc' } }),
      ['EXP_E', 'EXP_A', 'EXP_B', 'EXP_C', 'EXP_D'])
    assert.deepEqual(ids({ sort: { field: 'outputs:Strength', direction: 'desc' } }),
      ['EXP_B', 'EXP_C', 'EXP_A', 'EXP_E', 'EXP_D'])
    assert.deepEqual(ids({ sort: { field: 'inputs:Oven Temperature', direction: 'desc' } }),
      ['EXP_A', 'EXP_C', 'EXP_B', 'EXP_D', 'EXP_E'])
    assert.deepEqual(ids({ sort: { field: 'id', direction: 'desc' } }),
      ['EXP_E', 'EXP_D', 'EXP_C', 'EXP_B', 'EXP_A'])
  })

  it('sorts the matching subset without changing subsequent default queries', () => {
    const repository = createExperimentRepository(experimentFixture())
    const result = repository.list({
      filters: [{ propertyId: 'outputs:Strength', operator: 'gte', value: 2 }],
      sort: { field: 'outputs:Strength', direction: 'desc' },
    })
    assert.deepEqual(result.items.map((item) => item.id), ['EXP_B', 'EXP_C', 'EXP_A'])
    assert.equal(result.total, 5)
    assert.equal(result.matched, 3)
    assert.deepEqual(repository.list().items.map((item) => item.id), ids())
  })

  it('reports unknown properties even when the dataset or matching result is empty', () => {
    const fixtures = [experimentFixture(), {}]
    for (const fixture of fixtures) {
      const repository = createExperimentRepository(fixture)
      assert.throws(() => repository.list({
        search: 'no match',
        filters: [{ propertyId: 'outputs:Unknown', operator: 'eq', value: 0 }],
      }), QueryValidationError)
      assert.throws(() => repository.list({ sort: { field: 'inputs:Unknown', direction: 'asc' } }),
        QueryValidationError)
    }
  })

  it('rejects invalid numeric thresholds and inverted ranges', () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.throws(() => ids({ filters: [{ propertyId: 'inputs:Additive', operator: 'eq', value }] }),
        QueryValidationError)
      assert.throws(() => ids({
        filters: [{ propertyId: 'inputs:Additive', operator: 'between', min: value, max: 2 }],
      }), QueryValidationError)
      assert.throws(() => ids({
        filters: [{ propertyId: 'inputs:Additive', operator: 'between', min: 0, max: value }],
      }), QueryValidationError)
    }
    assert.throws(() => ids({
      filters: [{ propertyId: 'inputs:Additive', operator: 'between', min: 2, max: 1 }],
    }), /minimum above its maximum/)
  })

  it('rejects unsupported query values that arrive from untyped callers', () => {
    const invalidQueries = [
      { search: 5 },
      { sort: { field: 'id', direction: 'sideways' } },
      { filters: [{ propertyId: 'inputs:Additive', operator: 'contains', value: 1 }] },
      { filters: [{ propertyId: 'inputs:Additive', operator: 'eq', value: '1' }] },
      { filters: [{ propertyId: 'inputs:Additive', operator: 'eq', value: '' }] },
    ]
    for (const query of invalidQueries) {
      assert.throws(() => ids(query as unknown as ExperimentQuery), QueryValidationError)
    }
  })
})

describe('property metadata and immutable storage', () => {
  it('discovers properties across every record and distinguishes input and output names', () => {
    const properties = createExperimentRepository(experimentFixture()).getProperties()
    assert.deepEqual(properties.map((property) => property.id), [
      'outputs:Cure Time', 'outputs:Later Property', 'outputs:Shared', 'outputs:Strength',
      'inputs:Additive', 'inputs:Oven Temperature', 'inputs:Shared',
    ])
    assert.equal(properties.find((property) => property.id === 'inputs:Oven Temperature')?.category, 'process')
    assert.equal(properties.find((property) => property.id === 'inputs:Additive')?.category, 'ingredient')
    assert.equal(properties.find((property) => property.id === 'outputs:Strength')?.category, 'measurement')
  })

  it('reads zero and missing properties distinctly and handles names shared across groups', () => {
    const repository = createExperimentRepository(experimentFixture())
    const experiment = repository.getById('EXP_C')!
    const read = (id: PropertyId) =>
      getPropertyValue(experiment, repository.getProperties().find((property) => property.id === id)!)
    assert.equal(read('inputs:Additive'), 0)
    assert.equal(read('inputs:Shared'), 8)
    assert.equal(read('outputs:Shared'), 100)
    assert.equal(read('outputs:Later Property'), undefined)
  })

  it('preserves JSON keys that overlap with object prototype names', () => {
    const data: unknown = JSON.parse(`{
      "__proto__": {"inputs": {"constructor": 0}, "outputs": {"toString": 2}},
      "EMPTY": {"inputs": {}, "outputs": {}}
    }`)
    const repository = createExperimentRepository(data)
    assert.equal(repository.getById('__proto__')?.id, '__proto__')
    assert.deepEqual(repository.list({
      filters: [{ propertyId: 'outputs:toString', operator: 'gt', value: 0 }],
    }).items.map((item) => item.id), ['__proto__'])
    assert.deepEqual(repository.list({
      sort: { field: 'outputs:toString', direction: 'desc' },
    }).items.map((item) => item.id), ['__proto__', 'EMPTY'])
  })

  it('takes a snapshot without freezing or mutating caller data', () => {
    const source = experimentFixture()
    const original = structuredClone(source)
    const repository = createExperimentRepository(source)
    repository.list({ sort: { field: 'id', direction: 'desc' } })
    assert.deepEqual(source, original)
    source.EXP_A.inputs.Additive = 999
    delete (source as Partial<typeof source>).EXP_B
    assert.equal(repository.getById('EXP_A')?.inputs.Additive, 2)
    assert.equal(repository.list().total, 5)
    assert.ok(repository.getById('EXP_B'))
  })

  it('prevents consumers from corrupting records, list results, or property metadata', () => {
    const repository = createExperimentRepository(experimentFixture())
    const result = repository.list()
    const experiment = repository.getById('EXP_A')!
    assert.equal(Reflect.set(experiment.inputs, 'Additive', 999), false)
    assert.equal(Reflect.set(experiment.outputs, 'Strength', 999), false)
    assert.equal(Reflect.set(experiment, 'id', 'changed'), false)
    assert.equal(Reflect.set(result.items, 'length', 0), false)
    assert.equal(Reflect.set(result, 'matched', 999), false)
    assert.equal(Reflect.set(repository.getProperties()[0], 'name', 'changed'), false)
    assert.equal(Reflect.set(repository.getProperties(), 'length', 0), false)
    assert.equal(repository.getById('EXP_A')?.inputs.Additive, 2)
    assert.equal(repository.list().matched, 5)
  })
})
