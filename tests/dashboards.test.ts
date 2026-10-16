import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDashboard, createDashboardWidget, createDefaultDashboard, duplicateDashboard } from '../src/dashboards/defaults.ts'
import { dashboardQuery } from '../src/dashboards/query.ts'
import { createDashboardRepository } from '../src/dashboards/repository.ts'
import type { DashboardStorage } from '../src/dashboards/types.ts'
import { decodeDashboardStore, DashboardValidationError } from '../src/dashboards/validation.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { createExperimentRepository } from '../src/data/repository.ts'
import { createDashboardDraft, dashboardIsDirty, dashboardReducer } from '../src/features/dashboards/dashboardReducer.ts'
import { createFilterEditorState, filterEditorExpressions, getFilterEditorTree, reduceFilterEditor } from '../src/features/experiments/filterEditorState.ts'
import { countConditions } from '../src/features/experiments/filterTree.ts'
import { experimentFixture } from './fixtures.ts'

const now = '2026-10-15T16:00:00.000Z'
const later = '2026-10-15T17:00:00.000Z'
const real = getExperimentRepository()
const properties = real.getProperties()

function memoryStorage(initial: string | null = null) {
  let value = initial
  let writes = 0
  return { read: () => value, write: (next: string) => { value = next; writes++ }, writes: () => writes }
}

describe('saved dashboard repository', () => {
  it('seeds exactly one default with two configured plots, only on first use', () => {
    const storage = memoryStorage()
    const repository = createDashboardRepository(storage, properties, () => now)
    const initial = repository.list()
    assert.equal(initial.length, 1)
    assert.equal(initial[0]!.name, 'Experiment overview')
    assert.equal(initial[0]!.widgets.length, 2)
    assert.deepEqual(initial[0]!.widgets.map(widget => widget.configuration.chartAxes), [
      { x: 'inputs:Oven Temperature', y: 'outputs:Tensile Strength' },
      { x: 'outputs:Viscosity', y: 'outputs:Tensile Strength' },
    ])
    assert.deepEqual(repository.list(), initial)
    assert.deepEqual(createDashboardRepository(storage, properties, () => later).list(), initial)
    assert.equal(storage.writes(), 1)
  })

  it('saves and reloads names, layout, order, 3D camera, axes, search and filters', () => {
    const storage = memoryStorage()
    const repository = createDashboardRepository(storage, properties, () => later)
    const widget = createDashboardWidget('plot-1', properties)
    const input = {
      ...createDashboard('custom', '  Materials  ', now), search: 'EXP',
      filters: [{ operator: 'or', filters: [
        { propertyId: 'outputs:Tensile Strength', operator: 'gte', value: 14 },
        { propertyId: 'inputs:Oven Temperature', operator: 'eq', value: 375 },
      ] }],
      widgets: [{ ...widget, size: 'full', configuration: { ...widget.configuration, chartMode: '3d', chartCamera: { yaw: 75, pitch: 15, zoom: 1.2 } },
        plotFilter: { xPropertyId: 'outputs:Viscosity', yPropertyId: 'outputs:Tensile Strength', range: { x: [2300, 2600], y: [13, 15] } } }],
    } as const
    const saved = repository.save(input)
    assert.equal(saved.name, 'Materials')
    assert.equal(saved.updatedAt, later)
    assert.equal(saved.createdAt, now)
    const reloaded = createDashboardRepository(storage, properties).list().find(d => d.id === 'custom')!
    assert.deepEqual(reloaded, saved)
    assert.equal(reloaded.widgets[0]!.configuration.chartMode, '3d')
    assert.equal(reloaded.widgets[0]!.size, 'full')
    assert.deepEqual(reloaded.widgets[0]!.configuration.chartCamera, input.widgets[0].configuration.chartCamera)
    assert.deepEqual(real.list(dashboardQuery(reloaded)).items.map(experiment => experiment.id), [
      '20170102_EXP_56', '20170106_EXP_56', '20170113_EXP_74',
    ])
    assert.equal(input.name, '  Materials  ')
  })

  it('updates the existing dashboard and retains other dashboards saved by another instance', () => {
    const storage = memoryStorage()
    const first = createDashboardRepository(storage, properties, () => now)
    const second = createDashboardRepository(storage, properties, () => later)
    const initial = first.list()[0]!
    second.save(createDashboard('other', 'Other dashboard', now))
    first.save({ ...initial, name: 'Renamed overview' })
    assert.deepEqual(second.list().map(d => d.name), ['Renamed overview', 'Other dashboard'])
    assert.equal(second.list().length, 2)
  })

  it('persists deletion and never recreates a deliberately emptied library', () => {
    const storage = memoryStorage()
    const repository = createDashboardRepository(storage, properties, () => now)
    repository.remove(repository.list()[0]!.id)
    assert.deepEqual(repository.list(), [])
    assert.deepEqual(createDashboardRepository(storage, properties).list(), [])
  })

  it('preserves corrupt or unsupported saved data instead of silently overwriting it', () => {
    for (const raw of ['broken json', '{}', '{"version":2,"dashboards":[]}', '{"version":1,"dashboards":[null]}']) {
      const storage = memoryStorage(raw)
      const repository = createDashboardRepository(storage, properties)
      assert.throws(() => repository.list(), DashboardValidationError)
      assert.throws(() => repository.save(createDashboard('new', 'New', now)), DashboardValidationError)
      assert.throws(() => repository.remove('anything'), DashboardValidationError)
      assert.equal(storage.read(), raw)
      assert.equal(storage.writes(), 0)
    }
  })

  it('rejects invalid saved models and keeps previous data when validation or writes fail', () => {
    const storage = memoryStorage()
    const repository = createDashboardRepository(storage, properties, () => now)
    const dashboard = repository.list()[0]!
    const before = storage.read()
    const cases = [
      { ...dashboard, name: ' ' },
      { ...dashboard, createdAt: 'invalid' },
      { ...dashboard, widgets: [dashboard.widgets[0], dashboard.widgets[0]] },
      { ...dashboard, widgets: [{ ...dashboard.widgets[0], size: 'enormous' }] },
      { ...dashboard, widgets: [{ ...dashboard.widgets[0], configuration: { ...dashboard.widgets[0]!.configuration, chartAxes: { x: 'inputs:Missing', y: 'outputs:Tensile Strength' } } }] },
      { ...dashboard, filters: [{ operator: 'or', filters: [] }] },
      { ...dashboard, widgets: [{ ...dashboard.widgets[0], plotFilter: { xPropertyId: 'outputs:Viscosity', yPropertyId: 'outputs:Tensile Strength', range: { x: [10, 0], y: [0, 20] } } }] },
    ]
    for (const invalid of cases) {
      assert.throws(() => decodeDashboardStore(JSON.stringify({ version: 1, dashboards: [invalid] }), properties), DashboardValidationError)
    }
    assert.throws(() => repository.save({ ...dashboard, name: '' }), DashboardValidationError)
    assert.equal(storage.read(), before)
    const blocked: DashboardStorage = { read: storage.read, write: () => { throw new Error('Quota exceeded') } }
    const failure = createDashboardRepository(blocked, properties)
    assert.throws(() => failure.save({ ...dashboard, name: 'Not saved' }), /Quota exceeded/)
    assert.throws(() => failure.remove(dashboard.id), /Quota exceeded/)
    assert.equal(storage.read(), before)
    assert.throws(() => createDashboardRepository({ read: () => { throw new Error('Blocked') }, write: () => {} }, properties).list(), /Blocked/)
  })

  it('supports an empty dataset and keeps returned objects detached from storage', () => {
    const storage = memoryStorage()
    const repository = createDashboardRepository(storage, [], () => now)
    const first = repository.list()[0]!
    assert.equal(first.widgets[0]!.configuration.chartAxes.x, null)
    const changed = structuredClone(first)
    changed.widgets[0]!.configuration.chartMode = '3d'
    assert.equal(repository.list()[0]!.widgets[0]!.configuration.chartMode, '2d')
  })
})

describe('dashboard editing and linked filters', () => {
  const repository = createExperimentRepository(experimentFixture())
  const props = repository.getProperties()
  const base = createDefaultDashboard(props, now)

  it('edits, reorders, duplicates and removes widgets without affecting other plots or saved state', () => {
    let draft = createDashboardDraft(base)
    const firstId = base.widgets[0]!.id
    const secondId = base.widgets[1]!.id
    draft = dashboardReducer(draft, { type: 'chart', id: firstId, action: { type: 'chart-mode', mode: '3d' } })
    assert.equal(draft.dashboard.widgets[0]!.configuration.chartMode, '3d')
    assert.equal(draft.dashboard.widgets[1]!.configuration.chartMode, '2d')
    assert.equal(base.widgets[0]!.configuration.chartMode, '2d')
    draft = dashboardReducer(draft, { type: 'update-widget', id: firstId, patch: { title: 'Renamed plot', size: 'full' } })
    draft = dashboardReducer(draft, { type: 'move-widget', id: firstId, offset: 1 })
    assert.deepEqual(draft.dashboard.widgets.map(w => w.id), [secondId, firstId])
    assert.equal(draft.dashboard.widgets[1]!.size, 'full')
    assert.equal(dashboardReducer(draft, { type: 'move-widget', id: firstId, offset: 1 }), draft)
    draft = dashboardReducer(draft, { type: 'add-widget', widget: { ...draft.dashboard.widgets[1]!, id: 'copy' } })
    draft = dashboardReducer(draft, { type: 'remove-widget', id: firstId })
    assert.deepEqual(draft.dashboard.widgets.map(w => w.id), [secondId, 'copy'])
    assert.equal(base.widgets.length, 2)
    assert.equal(dashboardIsDirty(base, [base]), false)
    assert.equal(dashboardIsDirty(draft.dashboard, [base]), true)
  })

  it('duplicates dashboards with independent identities and configurations', () => {
    let id = 0
    const copy = duplicateDashboard(base, () => `copy-${++id}`, later)
    assert.equal(copy.name, 'Experiment overview copy')
    assert.equal(copy.createdAt, later)
    assert.equal(new Set([copy.id, ...copy.widgets.map(w => w.id)]).size, 3)
    assert.notEqual(copy.widgets[0]!.configuration, base.widgets[0]!.configuration)
    assert.ok(copy.widgets.every(w => !base.widgets.some(original => original.id === w.id)))
  })

  it('combines widget ranges with AND and excludes only the source range for its context', () => {
    const dashboard = { ...base, widgets: [
      { ...base.widgets[0]!, plotFilter: { xPropertyId: 'inputs:Additive', yPropertyId: 'outputs:Strength', range: { x: [0, 1], y: [8, 12] } } },
      { ...base.widgets[1]!, plotFilter: { xPropertyId: 'inputs:Oven Temperature', yPropertyId: 'outputs:Strength', range: { x: [370, 400], y: [0, 12] } } },
    ] } as const
    const ids = (context?: string) => repository.list(dashboardQuery(dashboard, context)).items.map(e => e.id)
    assert.deepEqual(ids(), ['EXP_C'])
    assert.deepEqual(ids(dashboard.widgets[0].id), ['EXP_C'])
    assert.deepEqual(ids(dashboard.widgets[1].id), ['EXP_B', 'EXP_C'])
    const removed = dashboardReducer(createDashboardDraft(dashboard), { type: 'remove-widget', id: dashboard.widgets[1].id })
    assert.deepEqual(repository.list(dashboardQuery(removed.dashboard)).items.map(e => e.id), ['EXP_B', 'EXP_C'])
    const cleared = dashboardReducer(createDashboardDraft(dashboard), { type: 'reset-filters' })
    assert.equal(repository.list(dashboardQuery(cleared.dashboard)).matched, 5)
    assert.equal(cleared.dashboard.widgets.length, 2)
  })

  it('round-trips nested logical filters and edits them with stable, unique editor IDs', () => {
    const expressions = [{ operator: 'or', filters: [
      { propertyId: 'outputs:Strength', operator: 'gte', value: 10 },
      { operator: 'and', filters: [
        { propertyId: 'inputs:Additive', operator: 'gt', value: 0 },
        { propertyId: 'outputs:Strength', operator: 'lt', value: 3 },
      ] },
    ] }] as const
    const editor = createFilterEditorState(expressions)
    assert.deepEqual(filterEditorExpressions(editor), expressions)
    assert.equal(countConditions(getFilterEditorTree(editor)), 3)
    assert.equal(editor.nextFilterId, 5)
    const updated = reduceFilterEditor(editor, { type: 'update-filter', id: 1, condition: { propertyId: 'outputs:Strength', operator: 'gt', value: 10 } })
    assert.deepEqual(repository.list({ filters: filterEditorExpressions(updated) }).items.map(e => e.id), ['EXP_A'])
    assert.deepEqual(filterEditorExpressions(editor), expressions)
    let draft = createDashboardDraft({ ...base, filters: expressions })
    draft = dashboardReducer(draft, { type: 'filter', action: { type: 'update-filter', id: 1, condition: { propertyId: 'outputs:Strength', operator: 'gt', value: 10 } } })
    assert.deepEqual(repository.list(dashboardQuery(draft.dashboard)).items.map(e => e.id), ['EXP_A'])
  })
})
