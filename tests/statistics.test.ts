import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getExperimentRepository } from '../src/data/index.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { buildStatistics } from '../src/data/statistics.ts'
import type { PropertyDefinition } from '../src/data/types.ts'
import { averageDeviationStrength, compareWithAverage } from '../src/features/experiments/averageComparison.ts'
import { formatAverage } from '../src/format.ts'
import { experimentFixture } from './fixtures.ts'

describe('dataset reference averages', () => {
  it('includes zero values, excludes missing values, and separates inputs from outputs', () => {
    const statistics = createExperimentRepository(experimentFixture()).getStatistics()
    const byId = new Map(statistics.map((item) => [item.propertyId, item]))
    assert.deepEqual(byId.get('inputs:Additive'), { propertyId: 'inputs:Additive', average: 0.75, count: 4 })
    assert.equal(byId.get('outputs:Strength')?.average, 5)
    assert.equal(byId.get('inputs:Oven Temperature')?.average, 400)
    assert.equal(byId.get('inputs:Shared')?.average, 8)
    assert.equal(byId.get('outputs:Shared')?.average, 100)
  })

  it('keeps references stable across searches and filters and prevents mutation', () => {
    const repository = createExperimentRepository(experimentFixture())
    const before = repository.getStatistics()
    repository.list({ search: 'EXP_A', filters: [{ propertyId: 'inputs:Additive', operator: 'gt', value: 0 }] })
    assert.strictEqual(repository.getStatistics(), before)
    assert.equal(before.find((item) => item.propertyId === 'inputs:Additive')?.average, 0.75)
    assert.ok(Object.isFrozen(before))
    assert.ok(before.every(Object.isFrozen))
  })

  it('does not invent a zero average for an empty or entirely missing property', () => {
    assert.deepEqual(createExperimentRepository({}).getStatistics(), [])
    const property: PropertyDefinition = { id: 'inputs:Missing', group: 'inputs', name: 'Missing', category: 'ingredient' }
    assert.deepEqual(buildStatistics([{ id: 'A', inputs: {}, outputs: {} }], [property]), [
      { propertyId: 'inputs:Missing', average: undefined, count: 0 },
    ])
  })

  it('handles all-zero and extreme finite measurements without overflow', () => {
    const repository = createExperimentRepository({
      A: { inputs: { Zero: 0, Large: Number.MAX_VALUE, Opposite: -Number.MAX_VALUE }, outputs: {} },
      B: { inputs: { Zero: 0, Large: Number.MAX_VALUE, Opposite: Number.MAX_VALUE }, outputs: {} },
    })
    const byId = new Map(repository.getStatistics().map((item) => [item.propertyId, item.average]))
    assert.equal(byId.get('inputs:Zero'), 0)
    assert.equal(byId.get('inputs:Large'), Number.MAX_VALUE)
    assert.equal(byId.get('inputs:Opposite'), 0)
  })

  it('calculates references for every real input and output from all 25 experiments', () => {
    const repository = getExperimentRepository()
    assert.equal(repository.getStatistics().length, 24)
    const experiments = repository.list().items
    for (const property of repository.getProperties()) {
      const reference = repository.getStatistics().find((item) => item.propertyId === property.id)
      const expected = experiments.reduce((sum, experiment) => sum + experiment[property.group][property.name]!, 0) / 25
      assert.equal(reference?.count, 25)
      assert.ok(Math.abs(reference!.average! - expected) < 1e-10, property.id)
    }
  })
})

describe('average comparisons', () => {
  it('increases color intensity with relative distance in either direction, regardless of units', () => {
    assert.equal(averageDeviationStrength(11, 10), 0.1)
    assert.equal(averageDeviationStrength(9, 10), 0.1)
    assert.equal(averageDeviationStrength(15, 10), 0.5)
    assert.equal(averageDeviationStrength(5, 10), 0.5)
    assert.equal(averageDeviationStrength(150, 100), 0.5)
    assert.equal(averageDeviationStrength(-15, -10), 0.5)
    assert.equal(averageDeviationStrength(-5, -10), 0.5)
  })

  it('caps extreme deviations and handles a zero mean without division by zero', () => {
    assert.equal(averageDeviationStrength(20, 10), 1)
    assert.equal(averageDeviationStrength(1000, 10), 1)
    assert.equal(averageDeviationStrength(-1000, 10), 1)
    assert.equal(averageDeviationStrength(1, 0), 1)
    assert.equal(averageDeviationStrength(-1, 0), 1)
    assert.equal(averageDeviationStrength(-Number.MAX_VALUE, Number.MAX_VALUE), 1)
  })

  it('keeps equal and missing references neutral, including floating-point noise', () => {
    assert.equal(averageDeviationStrength(10, 10), 0)
    assert.equal(averageDeviationStrength(0, 0), 0)
    assert.equal(averageDeviationStrength(0.3, 0.1 + 0.2), 0)
    assert.equal(averageDeviationStrength(undefined, 0), 0)
    assert.equal(averageDeviationStrength(0, undefined), 0)
  })

  it('identifies above, below and equal values, including zero and negative averages', () => {
    assert.equal(compareWithAverage(12, 10), 'above')
    assert.equal(compareWithAverage(8, 10), 'below')
    assert.equal(compareWithAverage(10, 10), 'equal')
    assert.equal(compareWithAverage(0, 0), 'equal')
    assert.equal(compareWithAverage(0, 1), 'below')
    assert.equal(compareWithAverage(1, 0), 'above')
    assert.equal(compareWithAverage(-3, -2), 'below')
  })

  it('leaves comparisons unavailable when the value or reference is missing', () => {
    assert.equal(compareWithAverage(undefined, 0), 'unavailable')
    assert.equal(compareWithAverage(0, undefined), 'unavailable')
  })

  it('ignores arithmetic noise but keeps differences hidden by rounded display values', () => {
    assert.equal(compareWithAverage(0.3, 0.1 + 0.2), 'equal')
    assert.equal(compareWithAverage(1.000001, 1), 'above')
    assert.equal(compareWithAverage(1e-20, 2e-20), 'below')
    assert.equal(compareWithAverage(-Number.MAX_VALUE, Number.MAX_VALUE), 'below')
    assert.equal(formatAverage(1.000001), '≈ 1')
    assert.equal(formatAverage(0), '0')
    assert.equal(formatAverage(undefined), '—')
  })
})
