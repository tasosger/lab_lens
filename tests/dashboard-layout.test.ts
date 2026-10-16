import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDashboard, createDashboardWidget, createDefaultDashboard } from '../src/dashboards/defaults.ts'
import { applyDashboardTemplate, DASHBOARD_TEMPLATES } from '../src/dashboards/layout.ts'
import { createDashboardRepository } from '../src/dashboards/repository.ts'
import { decodeDashboardStore, DashboardValidationError } from '../src/dashboards/validation.ts'
import { getExperimentRepository } from '../src/data/index.ts'
import { dashboardIsDirty, dashboardReducer, createDashboardDraft } from '../src/features/dashboards/dashboardReducer.ts'
import { reorderById } from '../src/components/reorder.ts'
import { resolveNavigation } from '../src/components/navigationGuard.ts'

const now = '2026-10-15T16:00:00.000Z'
const properties = getExperimentRepository().getProperties()
const initial = createDefaultDashboard(properties, now)
const source = {
  ...initial,
  widgets: [...initial.widgets, { ...createDashboardWidget('third', properties), title: 'Depth',
    configuration: { ...initial.widgets[0]!.configuration, chartMode: '3d' },
  }],
} as const

describe('dashboard layout templates', () => {
  it('changes only placement, retaining plot contents, order, IDs, cameras and chart settings', () => {
    const before = structuredClone(source)
    for (const template of DASHBOARD_TEMPLATES) {
      const result = applyDashboardTemplate(source, template.id)
      assert.equal(result.layout, template.id)
      assert.deepEqual(result.widgets.map(({ size: _size, ...content }) => content), source.widgets.map(({ size: _size, ...content }) => content))
      assert.equal(result.name, source.name)
      assert.equal(result.id, source.id)
    }
    assert.deepEqual(applyDashboardTemplate(source, 'grid').widgets.map(w => w.size), ['half', 'half', 'half'])
    assert.deepEqual(applyDashboardTemplate(source, 'stack').widgets.map(w => w.size), ['full', 'full', 'full'])
    assert.deepEqual(applyDashboardTemplate(source, 'feature').widgets.map(w => w.size), ['full', 'half', 'half'])
    assert.deepEqual(source, before)
  })

  it('can choose a layout before adding plots without creating or prescribing plot content', () => {
    let draft = createDashboardDraft(createDashboard('empty', 'Empty', now))
    draft = dashboardReducer(draft, { type: 'template', template: 'feature' })
    assert.equal(draft.dashboard.widgets.length, 0)
    for (const id of ['one', 'two', 'three']) draft = dashboardReducer(draft, { type: 'add-widget', widget: createDashboardWidget(id, properties) })
    assert.deepEqual(draft.dashboard.widgets.map(w => w.size), ['full', 'half', 'half'])
    draft = dashboardReducer(draft, { type: 'remove-widget', id: 'one' })
    assert.deepEqual(draft.dashboard.widgets.map(w => w.size), ['full', 'half'])
    assert.deepEqual(draft.dashboard.widgets.map(w => w.id), ['two', 'three'])
  })

  it('persists templates and custom order/width and marks layout changes as unsaved', () => {
    let raw: string | null = null
    const repository = createDashboardRepository({ read: () => raw, write: value => { raw = value } }, properties, () => now)
    const saved = repository.save(source)
    let draft = dashboardReducer(createDashboardDraft(saved), { type: 'template', template: 'stack' })
    assert.equal(dashboardIsDirty(draft.dashboard, [saved]), true)
    const stacked = repository.save(draft.dashboard)
    assert.equal(repository.list().find(d => d.id === source.id)!.layout, 'stack')
    assert.equal(dashboardIsDirty(stacked, [stacked]), false)
    draft = dashboardReducer(createDashboardDraft(stacked), { type: 'reorder-widget', id: 'third', targetId: stacked.widgets[0]!.id })
    draft = dashboardReducer(draft, { type: 'update-widget', id: 'third', patch: { size: 'half' } })
    assert.equal(draft.dashboard.layout, 'custom')
    assert.equal(dashboardIsDirty(draft.dashboard, [stacked]), true)
    const custom = repository.save(draft.dashboard)
    const reloaded = createDashboardRepository({ read: () => raw, write: () => {} }, properties).list().find(d => d.id === custom.id)!
    assert.deepEqual(reloaded, custom)
    assert.equal(reloaded.widgets[0]!.id, 'third')
    assert.equal(reloaded.widgets[0]!.size, 'half')
    assert.deepEqual(reloaded.widgets[0]!.configuration, source.widgets[2].configuration)
  })

  it('preserves older saved dashboards without a template and rejects unknown layouts', () => {
    const { layout: _layout, ...legacy } = source
    const raw = JSON.stringify({ version: 1, dashboards: [legacy] })
    const decoded = decodeDashboardStore(raw, properties).dashboards[0]!
    assert.equal(decoded.layout, 'custom')
    assert.deepEqual(decoded.widgets, legacy.widgets)
    assert.throws(() => decodeDashboardStore(JSON.stringify({ version: 1, dashboards: [{ ...source, layout: 'unknown' }] }), properties), DashboardValidationError)
  })

  it('does not mark unchanged operations dirty or change widths during custom rearranging', () => {
    const draft = createDashboardDraft(initial)
    assert.equal(dashboardIsDirty(dashboardReducer(draft, { type: 'template', template: 'grid' }).dashboard, [initial]), false)
    assert.equal(dashboardReducer(draft, { type: 'reorder-widget', id: 'missing', targetId: initial.widgets[0]!.id }), draft)
    assert.equal(dashboardReducer(draft, { type: 'remove-widget', id: 'missing' }), draft)
    const custom = dashboardReducer(draft, { type: 'update-widget', id: initial.widgets[0]!.id, patch: { size: 'full' } })
    const moved = dashboardReducer(custom, { type: 'reorder-widget', id: initial.widgets[0]!.id, targetId: initial.widgets[1]!.id })
    assert.equal(moved.dashboard.layout, 'custom')
    assert.equal(moved.dashboard.widgets[1]!.size, 'full')
    const removed = dashboardReducer(moved, { type: 'remove-widget', id: initial.widgets[1]!.id })
    assert.equal(removed.dashboard.widgets[0]!.size, 'full')
  })
})

describe('plot rearranging', () => {
  const items = ['a', 'b', 'c', 'd'].map(id => ({ id, content: `plot-${id}` }))
  it('moves forward and backward across multiple positions while retaining every plot', () => {
    const moved = reorderById(items, 'a', 'd')
    assert.deepEqual(moved.map(w => w.id), ['b', 'c', 'd', 'a'])
    assert.deepEqual(reorderById(moved, 'a', 'b'), items)
    assert.deepEqual(reorderById(items, 'b', 'd').map(w => w.id), ['a', 'c', 'd', 'b'])
    assert.deepEqual(items.map(w => w.id), ['a', 'b', 'c', 'd'])
    assert.equal(moved[3], items[0])
  })
  it('ignores self drops, missing sources and missing targets', () => {
    assert.equal(reorderById(items, 'a', 'a'), items)
    assert.equal(reorderById(items, 'missing', 'a'), items)
    assert.equal(reorderById(items, 'a', 'missing'), items)
    assert.deepEqual(reorderById([], 'a', 'b'), [])
  })
})

describe('unsaved navigation', () => {
  it('saves before leaving and blocks navigation if persistence fails', () => {
    const calls: string[] = []
    assert.equal(resolveNavigation('save', () => { calls.push('save failed'); return false }, () => calls.push('leave')), false)
    assert.deepEqual(calls, ['save failed'])
    assert.equal(resolveNavigation('save', () => { calls.push('saved'); return true }, () => calls.push('leave')), true)
    assert.deepEqual(calls, ['save failed', 'saved', 'leave'])
  })
  it('keeps editing on cancel, and leaves without writing only when explicitly chosen', () => {
    let writes = 0
    let leaves = 0
    const save = () => { writes++; return true }
    const proceed = () => { leaves++ }
    assert.equal(resolveNavigation('cancel', save, proceed), false)
    assert.equal(writes, 0)
    assert.equal(leaves, 0)
    assert.equal(resolveNavigation('leave', save, proceed), true)
    assert.equal(writes, 0)
    assert.equal(leaves, 1)
  })
})
