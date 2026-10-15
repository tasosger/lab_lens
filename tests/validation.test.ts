import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createExperimentRepository } from '../src/data/repository.ts'
import { DatasetValidationError } from '../src/data/validation.ts'

describe('dataset validation', () => {
  it('rejects values that cannot represent a JSON experiment dictionary', () => {
    for (const value of [null, undefined, [], 'data', 42, true, new Date()]) {
      assert.throws(() => createExperimentRepository(value), {
        name: 'DatasetValidationError',
        path: '$',
      })
    }
  })

  it('identifies malformed experiment records and missing groups', () => {
    for (const record of [null, [], 'record']) {
      assert.throws(() => createExperimentRepository({ EXP: record }), {
        name: 'DatasetValidationError',
        path: '$["EXP"]',
      })
    }
    assert.throws(() => createExperimentRepository({ EXP: { outputs: {} } }), {
      name: 'DatasetValidationError',
      path: '$["EXP"].inputs',
    })
    assert.throws(() => createExperimentRepository({ EXP: { inputs: {} } }), {
      name: 'DatasetValidationError',
      path: '$["EXP"].outputs',
    })
    for (const group of [null, [], 12]) {
      assert.throws(() => createExperimentRepository({ EXP: { inputs: group, outputs: {} } }),
        DatasetValidationError)
      assert.throws(() => createExperimentRepository({ EXP: { inputs: {}, outputs: group } }),
        DatasetValidationError)
    }
  })

  it('rejects blank experiment IDs and property names', () => {
    assert.throws(() => createExperimentRepository({ ' ': { inputs: {}, outputs: {} } }),
      /experiment IDs must not be blank/)
    assert.throws(() => createExperimentRepository({ EXP: { inputs: { '': 1 }, outputs: {} } }),
      /property names must not be blank/)
  })

  it('rejects nonnumeric and nonfinite measurements without coercing them', () => {
    for (const value of ['3.5', '', null, undefined, true, {}, [], NaN, Infinity, -Infinity]) {
      assert.throws(
        () => createExperimentRepository({ EXP: { inputs: {}, outputs: { Strength: value } } }),
        (error: unknown) => {
          assert.ok(error instanceof DatasetValidationError)
          assert.equal(error.path, '$["EXP"].outputs["Strength"]')
          assert.match(error.message, /expected a finite number/)
          return true
        },
      )
    }
  })

  it('rejects an invalid later record instead of silently returning a partial dataset', () => {
    assert.throws(() => createExperimentRepository({
      VALID: { inputs: { Additive: 0 }, outputs: { Strength: 1 } },
      INVALID: { inputs: { Additive: 'bad' }, outputs: {} },
    }), { name: 'DatasetValidationError', path: '$["INVALID"].inputs["Additive"]' })
  })

  it('preserves zero, negative values, precision, and original names', () => {
    const repository = createExperimentRepository({
      ' original ID ': {
        inputs: { 'Ingredient with spaces': 0 },
        outputs: { Decimal: 1.23456789, Negative: -2 },
      },
    })
    assert.deepEqual(repository.getById(' original ID '), {
      id: ' original ID ',
      inputs: { 'Ingredient with spaces': 0 },
      outputs: { Decimal: 1.23456789, Negative: -2 },
    })
  })

  it('accepts an empty dataset and records with empty property groups', () => {
    const empty = createExperimentRepository({})
    assert.deepEqual(empty.list(), { items: [], total: 0, matched: 0 })
    assert.deepEqual(empty.getProperties(), [])
    assert.equal(empty.getById('missing'), undefined)

    const repository = createExperimentRepository({ EXP: { inputs: {}, outputs: {} } })
    assert.equal(repository.list().total, 1)
    assert.deepEqual(repository.getProperties(), [])
  })
})
