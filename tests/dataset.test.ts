import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { getExperimentRepository } from '../src/data/index.ts'

describe('bundled dataset integration', () => {
  it('loads all supplied records and preserves every stored value', () => {
    const raw: Record<string, { inputs: Record<string, number>; outputs: Record<string, number> }> =
      JSON.parse(readFileSync(new URL('../src/data/experiments.json', import.meta.url), 'utf8'))
    const repository = getExperimentRepository()
    assert.equal(repository.list().total, 25)
    assert.equal(Object.keys(raw).length, 25)
    for (const [id, values] of Object.entries(raw)) {
      assert.deepEqual(repository.getById(id), { id, ...values })
    }
    assert.equal(repository.getById('20170102_EXP_56')?.inputs['Polymer 1'], 11.2)
    assert.equal(repository.getById('20170102_EXP_56')?.outputs.Viscosity, 2554.4)
  })

  it('exposes all 19 inputs and five outputs with the correct categories', () => {
    const properties = getExperimentRepository().getProperties()
    assert.equal(properties.filter((property) => property.group === 'inputs').length, 19)
    assert.equal(properties.filter((property) => property.group === 'outputs').length, 5)
    assert.equal(properties.filter((property) => property.category === 'ingredient').length, 18)
    assert.deepEqual(properties.filter((property) => property.category === 'process').map((property) => property.name),
      ['Oven Temperature'])
  })

  it('supports a search and numeric range against the real dataset', () => {
    const result = getExperimentRepository().list({
      search: '  20170102_exp_56 ',
      filters: [
        { propertyId: 'inputs:Oven Temperature', operator: 'between', min: 375, max: 375 },
        { propertyId: 'outputs:Tensile Strength', operator: 'gte', value: 13.8 },
      ],
      sort: { field: 'outputs:Viscosity', direction: 'desc' },
    })
    assert.equal(result.total, 25)
    assert.equal(result.matched, 1)
    assert.equal(result.items[0].id, '20170102_EXP_56')
  })
})
