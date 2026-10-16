import { useEffect, useRef, useState, type Dispatch } from 'react'
import type { Experiment, PropertyDefinition } from '../../data'
import { useDetailsDropdown } from '../../components/useDetailsDropdown'
import { FilterBuilder } from './FilterBuilder'
import { describeFilterExpression, isAppliedGroup, type AppliedFilterGroup } from './filterTree'
import { Icon } from './Icon'
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

export function FilterGroupEditor(props: GroupProps & { initialFilterId?: number }) {
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
  return <div ref={container}><FilterRuleGroup {...props} root editor={active}
    openEditor={(next, trigger) => { returnFocus.current = trigger; setEditor(next) }}
    closeEditor={() => setEditor(null)} /></div>
}

function FilterRuleGroup({ group, properties, experiments, dispatch, root = false, editor, openEditor, closeEditor }: GroupProps & {
  root?: boolean
  editor: Editor
  openEditor: (editor: Editor, trigger: HTMLElement | null) => void
  closeEditor: () => void
}) {
  const advanced = useDetailsDropdown()
  const adding = editor?.kind === 'add' && editor.id === group.id
  const showMode = !root || group.filters.length > 1 || group.operator === 'or'
  return <fieldset className="filter-rule-group" data-root={root}>
    <legend className={root ? 'sr-only' : undefined}>{root ? 'Filters' : 'Condition group'}</legend>
    {showMode && <div className="filter-rule-heading">
      <div className="filter-segmented" role="group" aria-label={root ? 'Match filters' : 'Match this group'}>
        <button type="button" aria-pressed={group.operator === 'and'}
          onClick={() => dispatch({ type: 'filter-mode', groupId: group.id, mode: 'and' })}>Match all <small>AND</small></button>
        <button type="button" aria-pressed={group.operator === 'or'}
          onClick={() => dispatch({ type: 'filter-mode', groupId: group.id, mode: 'or' })}>Match any <small>OR</small></button>
      </div>
      {!root && <button type="button" className="text-button" aria-label="Remove condition group"
        onClick={() => { dispatch({ type: 'remove-filter', id: group.id }); closeEditor() }}>Remove group</button>}
    </div>}
    <div className="filter-rule-list">
      {group.filters.map((node, index) => <div key={node.id} className="filter-rule-item">
        {index > 0 && <span className="filter-rule-join">{group.operator === 'and' ? 'and' : 'or'}</span>}
        {isAppliedGroup(node) ? <FilterRuleGroup group={node} properties={properties} experiments={experiments} dispatch={dispatch}
          editor={editor} openEditor={openEditor} closeEditor={closeEditor} /> : (() => {
          const description = describeFilterExpression(node.condition, properties)
          const editing = editor?.kind === 'edit' && editor.id === node.id
          const property = properties.find(item => item.id === node.condition.propertyId)
          return <>
            <div className="filter-rule-row" data-editing={editing}>
              <button type="button" className="filter-rule-edit" aria-label={'Edit filter ' + description} aria-expanded={editing}
                onClick={event => openEditor(editing ? null : { kind: 'edit', id: node.id }, event.currentTarget)}>
                <span className="filter-property-kind">{property?.group === 'inputs' ? 'Input' : 'Output'}</span>
                <span>{description}</span><Icon name="edit" />
              </button>
              <button type="button" className="chip-remove" aria-label={'Remove filter ' + description}
                onClick={() => { dispatch({ type: 'remove-filter', id: node.id }); if (editing) closeEditor() }}><Icon name="close" /></button>
            </div>
            {editing && <FilterBuilder properties={properties} experiments={experiments} initialCondition={node.condition}
              onApply={condition => dispatch({ type: 'update-filter', id: node.id, condition })} onClose={closeEditor} />}
          </>
        })()}
      </div>)}
    </div>
    {adding && <FilterBuilder properties={properties} experiments={experiments}
      onApply={condition => dispatch({ type: 'add-filter', groupId: group.id, condition })} onClose={closeEditor} />}
    <div className="filter-rule-actions">
      <button type="button" hidden={adding} className="text-button" onClick={event => openEditor({ kind: 'add', id: group.id }, event.currentTarget)}>+ Add filter</button>
      <details {...advanced.menuProps} className="filter-advanced">
        <summary ref={advanced.trigger}>Advanced <Icon name="chevron" /></summary>
        <div>
          <button type="button" className="text-button" onClick={() => {
            dispatch({ type: 'add-filter-group', groupId: group.id })
            openEditor({ kind: 'new-group', id: group.id }, advanced.trigger.current)
            advanced.close()
          }}>+ Add condition group</button>
          <p>Use a group for combinations such as (A or B) and C.</p>
        </div>
      </details>
    </div>
  </fieldset>
}
