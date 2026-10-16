import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getExperimentRepository } from '../src/data/index.ts'
import { createChartConfiguration, reduceChartConfiguration, scatterplotModeForValueCount } from '../src/features/charts/chartConfiguration.ts'

describe('scatterplot value selection', () => {
  it('adds and removes depth while retaining chosen properties and the camera', () => {
    const initial = createChartConfiguration(getExperimentRepository().getProperties())
    let chart = reduceChartConfiguration(initial, { type: 'chart-mode', mode: scatterplotModeForValueCount(3) })
    assert.equal(chart.chartMode, '3d')
    chart = reduceChartConfiguration(chart, { type: 'chart-z', propertyId: 'outputs:Viscosity' })
    chart = reduceChartConfiguration(chart, { type: 'chart-camera', camera: { yaw: 90, pitch: 40, zoom: 1.2 } })
    const threeValues = structuredClone(chart)
    chart = reduceChartConfiguration(chart, { type: 'chart-mode', mode: scatterplotModeForValueCount(2) })
    assert.equal(chart.chartMode, '2d')
    assert.deepEqual(chart.chartAxes, initial.chartAxes)
    chart = reduceChartConfiguration(chart, { type: 'chart-mode', mode: scatterplotModeForValueCount(3) })
    assert.deepEqual(chart, threeValues)
  })

  it('rejects a fourth value with a useful error and retains the last valid plot', () => {
    let chart = createChartConfiguration(getExperimentRepository().getProperties())
    chart = reduceChartConfiguration(chart, { type: 'chart-mode', mode: scatterplotModeForValueCount(3) })
    const lastValidPlot = chart
    assert.throws(() => {
      chart = reduceChartConfiguration(chart, { type: 'chart-mode', mode: scatterplotModeForValueCount(4) })
    }, { name: 'RangeError', message: 'Scatterplots support a maximum of 3 values. Remove the Z axis before adding another.' })
    assert.strictEqual(chart, lastValidPlot)
    for (const count of [0, 1, 2.5, 100, NaN, Infinity]) {
      assert.throws(() => scatterplotModeForValueCount(count), RangeError)
    }
  })
})
