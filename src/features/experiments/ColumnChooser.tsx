import type { PropertyDefinition, PropertyId } from '../../data'
import { Icon } from '../../components/Icon'

export function ColumnChooser({ properties, visibleColumns, onToggle, onReset, onClose }: {
  properties: readonly PropertyDefinition[]
  visibleColumns: readonly PropertyId[]
  onToggle: (id: PropertyId) => void
  onReset: () => void
  onClose: () => void
}) {
  return (
    <div id="column-chooser" className="column-chooser">
      <div className="editor-heading">
        <div>
          <strong>Visible columns</strong>
          <p>Experiment names always stay visible.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Close column chooser"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>

      {(['outputs', 'inputs'] as const).map((group) => (
        <fieldset key={group}>
          <legend>{group === 'outputs' ? 'Outputs' : 'Inputs'}</legend>
          <div className="column-options">
            {properties
              .filter((property) => property.group === group)
              .map((property) => (
                <label key={property.id}>
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(property.id)}
                    onChange={() => onToggle(property.id)}
                  />
                  {property.name}
                </label>
              ))}
          </div>
        </fieldset>
      ))}

      <button
        className="text-button"
        onClick={onReset}
      >
        Restore default columns
      </button>
    </div>
  )
}
