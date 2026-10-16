import { useId, useRef, useState, type Dispatch } from 'react'
import type { NumericFilter, PropertyDefinition } from '../../data'
import { FilterBuilder } from './FilterBuilder'
import {
  describeFilterExpression,
  isAppliedGroup,
  type AppliedFilter,
  type AppliedFilterGroup,
} from './filterTree'
import { Icon } from './Icon'
import type { WorkspaceAction } from './workspaceReducer'

export function FilterGroupEditor({ group, properties, dispatch, onRemove }: {
  group: AppliedFilterGroup
  properties: readonly PropertyDefinition[]
  dispatch: Dispatch<WorkspaceAction>
  onRemove?: () => void
}) {
  const [addingCondition, setAddingCondition] = useState(false)
  const addConditionButton = useRef<HTMLButtonElement>(null)
  const addGroupButton = useRef<HTMLButtonElement>(null)
  const title = group.id === 0 ? 'All filters' : `Group ${group.id}`

  function closeCondition() {
    setAddingCondition(false)
    addConditionButton.current?.focus()
  }

  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      <div className="filter-group-heading">
        <label className="match-mode">
          Match
          <select
            autoFocus={group.id === 0}
            aria-label={`${title} match mode`}
            value={group.operator}
            onChange={(event) => dispatch({
              type: 'filter-mode',
              groupId: group.id,
              mode: event.target.value as 'and' | 'or',
            })}
          >
            <option value="and">all (AND)</option>
            <option value="or">any (OR)</option>
          </select>
          <span>of the following</span>
        </label>
        {onRemove && (
          <button
            className="icon-button"
            aria-label={`Remove ${title} and its conditions`}
            onClick={onRemove}
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      {group.filters.length === 0 && (
        <p className="empty-filter-group">Add a condition or group. Empty groups do not filter results.</p>
      )}
      <div className="filter-group-children">
        {group.filters.map((node, index) => (
          <div key={node.id}>
            {index > 0 && <div className="filter-join">{group.operator.toUpperCase()}</div>}
            {isAppliedGroup(node) ? (
              <FilterGroupEditor
                group={node}
                properties={properties}
                dispatch={dispatch}
                onRemove={() => {
                  dispatch({ type: 'remove-filter', id: node.id })
                  addGroupButton.current?.focus()
                }}
              />
            ) : (
              <FilterConditionEditor
                filter={node}
                properties={properties}
                onApply={(condition) => dispatch({ type: 'update-filter', id: node.id, condition })}
                onRemove={() => {
                  dispatch({ type: 'remove-filter', id: node.id })
                  addConditionButton.current?.focus()
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="filter-group-actions">
        <button
          ref={addConditionButton}
          className="text-button"
          aria-expanded={addingCondition}
          aria-label={`Add condition to ${title}`}
          onClick={() => setAddingCondition(!addingCondition)}
        >
          + Add condition
        </button>
        <button
          ref={addGroupButton}
          className="text-button"
          aria-label={`Add group to ${title}`}
          onClick={() => dispatch({ type: 'add-filter-group', groupId: group.id })}
        >
          + Add group
        </button>
      </div>
      {addingCondition && (
        <FilterBuilder
          properties={properties}
          onApply={(condition) => dispatch({ type: 'add-filter', groupId: group.id, condition })}
          onClose={closeCondition}
        />
      )}
    </fieldset>
  )
}

function FilterConditionEditor({ filter, properties, onApply, onRemove }: {
  filter: AppliedFilter
  properties: readonly PropertyDefinition[]
  onApply: (condition: NumericFilter) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const editButton = useRef<HTMLButtonElement>(null)
  const editorId = useId()
  const description = describeFilterExpression(filter.condition, properties)

  function closeEditor() {
    setEditing(false)
    editButton.current?.focus()
  }

  return (
    <div className="filter-condition-container">
      <div className="filter-condition">
        <span>{description}</span>
        <div className="filter-condition-actions">
          <button
            ref={editButton}
            className="text-button"
            aria-label={`Edit filter ${description}`}
            aria-expanded={editing}
            aria-controls={editing ? editorId : undefined}
            onClick={() => setEditing(!editing)}
          >
            Edit
          </button>
          <button className="chip-remove" aria-label={`Remove filter ${description}`} onClick={onRemove}>
            <Icon name="close" />
          </button>
        </div>
      </div>
      {editing && (
        <div id={editorId}>
          <FilterBuilder
            properties={properties}
            initialCondition={filter.condition}
            onApply={onApply}
            onClose={closeEditor}
          />
        </div>
      )}
    </div>
  )
}
