import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createExperimentRepository } from '../src/data/repository.ts'
import { createChartConfiguration, reduceChartConfiguration } from '../src/chart-model/configuration.ts'
import { chartDefinitions, chartTypes, isChartType } from '../src/chart-model/registry.ts'
import { validateChartConfiguration } from '../src/chart-model/validation.ts'
import { ChartValidationError } from '../src/chart-model/validationContext.ts'
import { createWorkspaceState, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'
import { experimentFixture } from './fixtures.ts'

const properties = createExperimentRepository(experimentFixture()).getProperties()

describe('shared chart model', () => {
  it('round-trips every chart with empty, single-property, and single-group datasets', () => {
    const datasets = [properties, [], properties.slice(0, 1),
      properties.filter(property => property.group === 'inputs'), properties.filter(property => property.group === 'outputs')]
    for (const dataset of datasets) for (const chartType of chartTypes) {
      const configuration = { ...createChartConfiguration(dataset), chartType }
      const decoded = validateChartConfiguration(JSON.parse(JSON.stringify(configuration)), dataset)
      assert.deepEqual(decoded, configuration)
      assert.notEqual(decoded.heatmapX, configuration.heatmapX)
      assert.ok(chartDefinitions[chartType].propertyIds(decoded).every(id => id === null || dataset.some(p => p.id === id)))
    }
  })

  it('preserves legacy axes/camera while supplying defaults for newer settings and removing unknown fields', () => {
    const defaults = createChartConfiguration(properties)
    const legacy = { chartAxes: defaults.chartAxes, chartMode: '3d', chartZ: defaults.chartZ,
      chartCamera: defaults.chartCamera, plotRanges: { x: [0, 1] } }
    const decoded = validateChartConfiguration(legacy, properties)
    assert.deepEqual(decoded, { ...defaults, chartMode: '3d' })
    assert.deepEqual(chartDefinitions.scatterplot.propertyIds(decoded), [defaults.chartAxes.x, defaults.chartAxes.y])
    assert.equal('plotRanges' in decoded, false)
  })

  it('rejects unknown types and malformed inactive settings rather than silently replacing them', () => {
    const defaults = createChartConfiguration(properties)
    for (const value of ['unknown', '__proto__', 'constructor', null, 1]) {
      assert.equal(isChartType(value), false)
      assert.throws(() => validateChartConfiguration({ ...defaults, chartType: value }, properties), ChartValidationError)
    }
    for (const patch of [
      { pieGrouping: 'sum' }, { histogramBins: 0 }, { pieBins: Infinity },
      { parallelProperties: ['outputs:Missing'] }, { heatmapX: [properties[0].id, properties[0].id] },
      { chartAxes: { x: null, y: 'inputs:Missing' } }, { hideZeroInputs: 'true' },
      { chartCamera: { yaw: 0, pitch: 0, zoom: NaN } },
    ]) assert.throws(() => validateChartConfiguration({ ...defaults, ...patch }, properties), ChartValidationError)
  })

  it('keeps chart identity stable across unrelated workspace actions and preserves inactive choices', () => {
    const initial = createWorkspaceState(properties)
    let state = workspaceReducer(initial, { type: 'toggle-selection', id: 'EXP_A' })
    state = workspaceReducer(state, { type: 'search', value: 'EXP' })
    state = workspaceReducer(state, { type: 'open-experiment', id: 'EXP_A' })
    assert.strictEqual(state.chart, initial.chart)
    state = workspaceReducer(state, { type: 'histogram-bins', bins: 7 })
    assert.notStrictEqual(state.chart, initial.chart)
    for (const chartType of chartTypes) state = workspaceReducer(state, { type: 'chart-type', chartType })
    assert.equal(state.chart.histogramBins, 7)
    assert.deepEqual(state.chart.chartAxes, initial.chart.chartAxes)
    assert.deepEqual(state.selectedIds, ['EXP_A'])
    assert.strictEqual(workspaceReducer(state, { type: 'histogram-bins', bins: 0 }), state)
  })

  it('copies axis lists so caller mutations cannot change configured charts', () => {
    const ids = properties.slice(0, 2).map(property => property.id)
    const config = reduceChartConfiguration(createChartConfiguration(properties), { type: 'parallel-properties', propertyIds: ids })
    const expected = [...ids]
    ids.reverse()
    assert.deepEqual(config.parallelProperties, expected)
  })
})
