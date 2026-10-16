import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { numericDomain } from '../src/charts/numericScale.ts'
import { cameraAfterDrag, cameraAfterWheel, create3DProjector, DEFAULT_ORBIT_CAMERA, isRotationDrag, normalizeCamera, projectUnit3D } from '../src/charts/projection3D.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { buildScatter3DData, defaultChartAxes, defaultChartZ } from '../src/features/charts/scatterData.ts'
import { createWorkspaceState, getWorkspaceQuery, workspaceReducer } from '../src/features/experiments/workspaceReducer.ts'

describe('three-dimensional scatterplot data', () => {
  it('keeps zero Z values and omits a record missing any of the three axes', () => {
    const repository = createExperimentRepository({
      A: { inputs: { X: 1, Y: 2 }, outputs: { Z: 0 } },
      B: { inputs: { X: 0 }, outputs: { Z: 5 } },
      C: { inputs: { X: 2, Y: 3 }, outputs: {} },
      D: { inputs: { X: -2, Y: 4 }, outputs: { Z: -3 } },
    })
    const properties = repository.getProperties()
    const x = properties.find((property) => property.name === 'X')!
    const y = properties.find((property) => property.name === 'Y')!
    const z = properties.find((property) => property.name === 'Z')!
    const result = buildScatter3DData(repository.list().items, x, y, z)
    assert.deepEqual(result.points, [
      { id: 'A', label: 'A', x: 1, y: 2, z: 0 },
      { id: 'D', label: 'D', x: -2, y: 4, z: -3 },
    ])
    assert.equal(result.omittedCount, 2)
    assert.deepEqual(buildScatter3DData([], x, y, z), { points: [], omittedCount: 0 })
    assert.equal(buildScatter3DData(repository.list().items, x, x, x).points.length, 4)
  })

  it('selects a third property when possible and handles a small or empty dataset', () => {
    const repository = getExperimentRepository()
    assert.equal(defaultChartZ(repository.getProperties()), 'outputs:Elongation')
    assert.equal(defaultChartZ([]), null)
    assert.equal(defaultChartZ(repository.getProperties().slice(0, 1)), repository.getProperties()[0]!.id)
  })

  it('projects all real experiments with any of the 24 properties as Z', () => {
    const repository = getExperimentRepository()
    const properties = repository.getProperties()
    const axes = defaultChartAxes(properties)
    const x = properties.find((property) => property.id === axes.x)!
    const y = properties.find((property) => property.id === axes.y)!
    for (const z of properties) {
      const data = buildScatter3DData(repository.list().items, x, y, z)
      assert.equal(data.points.length, 25)
      assert.equal(data.omittedCount, 0)
      const project = create3DProjector([
        numericDomain(data.points.map((point) => point.x)),
        numericDomain(data.points.map((point) => point.y)),
        numericDomain(data.points.map((point) => point.z)),
      ], DEFAULT_ORBIT_CAMERA, 800, 440)
      for (const point of data.points) {
        const position = project([point.x, point.y, point.z])
        assert.ok(position.x > 0 && position.x < 800)
        assert.ok(position.y > 0 && position.y < 440)
        assert.ok(Number.isFinite(position.depth))
      }
    }
  })
})

describe('3D projection and camera', () => {
  it('zooms in with upward scrolling and out with downward scrolling without rotating', () => {
    const camera = { yaw: 80, pitch: -20, zoom: 1 }
    const closer = cameraAfterWheel(camera, -100)
    const farther = cameraAfterWheel(camera, 100)
    assert.ok(closer.zoom > camera.zoom)
    assert.ok(farther.zoom < camera.zoom)
    assert.equal(closer.yaw, camera.yaw)
    assert.equal(closer.pitch, camera.pitch)
    assert.ok(Math.abs(cameraAfterWheel(closer, 100).zoom - camera.zoom) < 1e-10)
  })

  it('normalizes wheel delta modes, limits zoom, and ignores invalid or horizontal-only scrolls', () => {
    assert.deepEqual(cameraAfterWheel(DEFAULT_ORBIT_CAMERA, 3, 1), cameraAfterWheel(DEFAULT_ORBIT_CAMERA, 48, 0))
    assert.deepEqual(cameraAfterWheel(DEFAULT_ORBIT_CAMERA, 0.1, 2), cameraAfterWheel(DEFAULT_ORBIT_CAMERA, 80, 0))
    assert.equal(cameraAfterWheel({ ...DEFAULT_ORBIT_CAMERA, zoom: 1.4 }, -10000).zoom, 1.4)
    assert.equal(cameraAfterWheel({ ...DEFAULT_ORBIT_CAMERA, zoom: 0.6 }, 10000).zoom, 0.6)
    assert.strictEqual(cameraAfterWheel(DEFAULT_ORBIT_CAMERA, 0), DEFAULT_ORBIT_CAMERA)
    assert.strictEqual(cameraAfterWheel(DEFAULT_ORBIT_CAMERA, NaN), DEFAULT_ORBIT_CAMERA)
    assert.strictEqual(cameraAfterWheel(DEFAULT_ORBIT_CAMERA, Infinity), DEFAULT_ORBIT_CAMERA)
  })

  it('centers the origin, keeps Z vertical, and rotates depth into the horizontal axis', () => {
    const camera = { yaw: 0, pitch: 0, zoom: 1 }
    assert.deepEqual(projectUnit3D([0, 0, 0], camera, 800, 400), { x: 400, y: 200, depth: 0 })
    const vertical = projectUnit3D([0, 0, 1], camera, 800, 400)
    assert.equal(vertical.x, 400)
    assert.ok(vertical.y < 200)
    const depth = projectUnit3D([0, 1, 0], camera, 800, 400)
    assert.equal(depth.x, 400)
    assert.equal(depth.y, 200)
    assert.equal(depth.depth, 1)
    const rotated = projectUnit3D([0, 1, 0], { ...camera, yaw: 90 }, 800, 400)
    assert.ok(rotated.x < 400)
    assert.ok(Math.abs(rotated.depth) < 1e-10)
  })

  it('normalizes different numeric ranges and constant axes without invalid coordinates', () => {
    const project = create3DProjector([[0, 1000], [-1, 1], [5, 5]], DEFAULT_ORBIT_CAMERA, 320, 300)
    const centered = project([500, 0, 5])
    assert.ok(Math.abs(centered.x - 160) < 1e-10)
    assert.ok(Math.abs(centered.y - 150) < 1e-10)
    const extreme = create3DProjector([[-Number.MAX_VALUE, Number.MAX_VALUE], [0, Number.MIN_VALUE], [0, 1]], DEFAULT_ORBIT_CAMERA, 800, 440)
    assert.ok(Object.values(extreme([Number.MAX_VALUE, Number.MIN_VALUE, 1])).every(Number.isFinite))
  })

  it('clamps tilt and zoom, wraps rotation, and distinguishes clicks from rotation drags', () => {
    assert.deepEqual(normalizeCamera({ yaw: 725, pitch: 1000, zoom: 100 }), { yaw: 5, pitch: 75, zoom: 1.4 })
    assert.deepEqual(normalizeCamera({ yaw: -725, pitch: -1000, zoom: 0 }), { yaw: -5, pitch: -75, zoom: 0.6 })
    assert.deepEqual(normalizeCamera({ yaw: NaN, pitch: Infinity, zoom: NaN }), DEFAULT_ORBIT_CAMERA)
    assert.equal(isRotationDrag(1, 1), false)
    assert.equal(isRotationDrag(4, 0), true)
    const moved = cameraAfterDrag(DEFAULT_ORBIT_CAMERA, 20, 10)
    assert.equal(moved.yaw, 45)
    assert.equal(moved.pitch, 29)
    assert.equal(moved.zoom, 1)
  })

  it('zooms around the scene center without changing depth or original values', () => {
    const camera = { yaw: 0, pitch: 0, zoom: 1 }
    const normal = projectUnit3D([1, 0, 1], camera, 800, 400)
    const zoomed = projectUnit3D([1, 0, 1], { ...camera, zoom: 1.4 }, 800, 400)
    assert.ok(Math.abs((zoomed.x - 400) / (normal.x - 400) - 1.4) < 1e-10)
    assert.equal(zoomed.depth, normal.depth)
  })
})

describe('3D workspace state', () => {
  it('swaps every axis pair without changing the property-bound filters, camera, or selections', () => {
    let state = createWorkspaceState(getExperimentRepository().getProperties())
    state = workspaceReducer(state, { type: 'chart-mode', mode: '3d' })
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_A' })
    state = workspaceReducer(state, { type: 'set-plot-filter', filter: { xPropertyId: state.chartAxes.x!, yPropertyId: state.chartAxes.y!, range: { x: [0, 100], y: [0, 50] } } })
    const before = structuredClone(state)
    for (const pair of ['xy', 'xz', 'yz'] as const) {
      const swapped = workspaceReducer(state, { type: 'swap-chart-axes', pair })
      assert.deepEqual(swapped.chartAxes, pair === 'xy'
        ? { x: state.chartAxes.y, y: state.chartAxes.x }
        : pair === 'xz' ? { x: state.chartZ, y: state.chartAxes.y } : { x: state.chartAxes.x, y: state.chartZ })
      assert.equal(swapped.chartZ, pair === 'xz' ? state.chartAxes.x : pair === 'yz' ? state.chartAxes.y : state.chartZ)
      assert.deepEqual(getWorkspaceQuery(swapped), getWorkspaceQuery(state))
      assert.deepEqual(swapped.selectedIds, state.selectedIds)
      assert.deepEqual(swapped.chartCamera, state.chartCamera)
      assert.deepEqual(workspaceReducer(swapped, { type: 'swap-chart-axes', pair }), state)
    }
    assert.deepEqual(state, before)
  })

  it('preserves axes, camera, selections and shared plot filters across mode and view switches', () => {
    let state = createWorkspaceState(getExperimentRepository().getProperties())
    assert.equal(state.chartMode, '2d')
    state = workspaceReducer(state, { type: 'chart-mode', mode: '3d' })
    state = workspaceReducer(state, { type: 'chart-z', propertyId: 'outputs:Viscosity' })
    state = workspaceReducer(state, { type: 'chart-camera', camera: { yaw: 80, pitch: 10, zoom: 1.2 } })
    state = workspaceReducer(state, { type: 'toggle-selection', id: 'EXP_A' })
    state = workspaceReducer(state, { type: 'set-plot-filter', filter: { xPropertyId: state.chartAxes.x!, yPropertyId: state.chartAxes.y!, range: { x: [0, 1000], y: [0, 1000] } } })
    const query = getWorkspaceQuery(state)
    const axes = state.chartAxes
    state = workspaceReducer(state, { type: 'chart-mode', mode: '2d' })
    state = workspaceReducer(state, { type: 'view', view: 'compare' })
    state = workspaceReducer(state, { type: 'view', view: 'charts' })
    state = workspaceReducer(state, { type: 'chart-mode', mode: '3d' })
    assert.deepEqual(getWorkspaceQuery(state), query)
    assert.deepEqual(state.chartAxes, axes)
    assert.equal(state.chartZ, 'outputs:Viscosity')
    assert.deepEqual(state.chartCamera, { yaw: 80, pitch: 10, zoom: 1.2 })
    assert.deepEqual(state.selectedIds, ['EXP_A'])
    state = workspaceReducer(state, { type: 'swap-chart-axes' })
    assert.equal(state.chartZ, 'outputs:Viscosity')
  })
})
