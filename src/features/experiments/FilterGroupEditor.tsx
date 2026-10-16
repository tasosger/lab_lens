import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import type { Experiment, NumericFilter, PropertyDefinition } from '../../data'
import { queryExperiments } from '../../data/query'
import { previewFilterQuery, type FilterEditTarget } from './filterPreview'
import { useDetailsDropdown } from '../../components/useDetailsDropdown'
import { FilterBuilder } from './FilterBuilder'
import { describeFilterExpression, isAppliedGroup, type AppliedFilterGroup } from './filterTree'
import { Icon } from '../../components/Icon'
import type { FilterEditorAction } from './filterEditorState'
import './filters.css'

type Editor = { kind: 'add' | 'edit' | 'new-group'; id: number } | null
type GroupProps = {
  group: AppliedFilterGroup
  properties: readonly PropertyDefinition[]
  experiments: readonly Experiment[]
  dispatch: Dispatch<FilterEditorAction>
}

function findGroup(group: AppliedFilterGroup, id: number): AppliedFilterGroup | undefined {
  if (group.id === id) return group
  for (const child of group.filters) {
    if (isAppliedGroup(child)) {
      const found = findGroup(child, id)
      if (found) return found
    }
  }
}

type PreviewCondition = (target: FilterEditTarget, condition: NumericFilter) => number

export function FilterGroupEditor(props: GroupProps & { initialFilterId?: number; search?: string }) {
  const propertiesById = useMemo(() => new Map(props.properties.map(property => [property.id, property])), [props.properties])
  const preview: PreviewCondition = (target, condition) => queryExperiments(props.experiments, propertiesById,
    previewFilterQuery(props.group, target, condition, props.search)).length
  const [editor, setEditor] = useState<Editor>(() => props.initialFilterId !== undefined
    ? { kind: 'edit', id: props.initialFilterId }
    : props.group.filters.length === 0 ? { kind: 'add', id: props.group.id } : null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!editor) {
      if (returnFocus.current?.isConnected) returnFocus.current.focus()
      else container.current?.querySelector<HTMLButtonElement>('.filter-rule-actions > button')?.focus()
    }
  }, [editor])
  let active = editor
  if (editor?.kind === 'new-group') {
    const last = findGroup(props.group, editor.id)?.filters.at(-1)
    active = last && isAppliedGroup(last) ? { kind: 'add', id: last.id } : null
  }
  return <div ref={container}><FilterRuleGroup {...props} root editor={active} preview={preview}
    openEditor={(next, trigger) => { returnFocus.current = trigger; setEditor(next) }}
    closeEditor={() => setEditor(null)} /></div>
}

function FilterRuleGroup({ group, properties, experiments, dispatch, root = false, editor, preview, openEditor, closeEditor }: GroupProps & {
  root?: boolean
  editor: Editor
  preview: PreviewCondition
  openEditor: (editor: Editor, trigger: HTMLElement | null) => void
  closeEditor: () => void
}) {
  const advanced = useDetailsDropdown()
  const adding = editor?.kind === 'add' && editor.id === group.id
  const showMode = !root || group.filters.length + (adding ? 1 : 0) > 1 || group.operator === 'or'
  return <fieldset className="filter-rule-group" data-root={root}>
    <legend className={root ? 'sr-only' : undefined}>{root ? 'Filters' : 'Condition group'}</legend>
    {showMode && <div className="filter-rule-heading">
      <div className="filter-segmented" role="group" aria-label={root ? 'Match filters' : 'Match this group'}>
        <button type="button" aria-pressed={group.operator === 'and'}
          onClick={() => dispatch({ type: 'filter-mode', groupId: group.id, mode: 'and' })}>Match all <small>AND</small></button>
        <button type="button" aria-pressed={group.operator === 'or'}
          onClick={() => dispatch({ type: 'filter-mode', groupId: group.id, mode: 'or' })}>Match any <small>OR</small></button>
      </div>
      {!root && <button type="button" className="icon-button" aria-label="Remove condition group" title="Remove condition group"
        onClick={() => { dispatch({ type: 'remove-filter', id: group.id }); closeEditor() }}><Icon name="close" /></button>}
    </div>}
    <div className="filter-rule-list">
      {group.filters.map((node, index) => <div key={node.id} className="filter-rule-item">
        {index > 0 && <span className="filter-rule-join">{group.operator === 'and' ? 'and' : 'or'}</span>}
        {isAppliedGroup(node) ? <FilterRuleGroup group={node} properties={properties} experiments={experiments} dispatch={dispatch}
          editor={editor} preview={preview} openEditor={openEditor} closeEditor={closeEditor} /> : (() => {
          const description = describeFilterExpression(node.condition, properties)
          const editing = editor?.kind === 'edit' && editor.id === node.id
          const property = properties.find(item => item.id === node.condition.propertyId)
          return editing
            ? <FilterBuilder properties={properties} experiments={experiments} initialCondition={node.condition}
              previewCondition={condition => preview({ kind: 'edit', id: node.id }, condition)}
              onApply={condition => dispatch({ type: 'update-filter', id: node.id, condition })} onClose={closeEditor} />
            : <div className="filter-rule-row">
              <button type="button" className="filter-rule-edit" aria-label={'Edit filter ' + description} aria-expanded={false}
                onClick={event => openEditor({ kind: 'edit', id: node.id }, event.currentTarget)}>
                <span className="filter-property-kind">{property?.group === 'inputs' ? 'Input' : 'Output'}</span>
                <span>{description}</span><Icon name="edit" />
              </button>
              <button type="button" className="chip-remove" aria-label={'Remove filter ' + description} title="Remove filter"
                onClick={() => dispatch({ type: 'remove-filter', id: node.id })}><Icon name="close" /></button>
            </div>
        })()}
      </div>)}
    </div>
    {adding && <FilterBuilder properties={properties} experiments={experiments}
      previewCondition={condition => preview({ kind: 'add', id: group.id }, condition)}
      onApply={condition => dispatch({ type: 'add-filter', groupId: group.id, condition })} onClose={closeEditor} />}
    <div className="filter-rule-actions">
      <button type="button" hidden={adding} className="text-button" onClick={event => openEditor({ kind: 'add', id: group.id }, event.currentTarget)}>+ Add filter</button>
      {group.filters.length > 0 && !editor && <details {...advanced.menuProps} className="filter-advanced">
        <summary ref={advanced.trigger}>Advanced <Icon name="chevron" /></summary>
        <div>
          <button type="button" className="text-button" onClick={() => {
            dispatch({ type: 'add-filter-group', groupId: group.id })
            openEditor({ kind: 'new-group', id: group.id }, advanced.trigger.current)
            advanced.close()
          }}>+ Add condition group</button>
          <p>Use a group for combinations such as (A or B) and C.</p>
        </div>
      </details>}
    </div>
  </fieldset>
}
