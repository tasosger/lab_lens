import { useId, useState, type FormEvent } from 'react'
import type { NumericFilter, PropertyDefinition, PropertyId } from '../../data'
import { Icon } from './Icon'

const operatorOptions: { value: NumericFilter['operator']; label: string }[] = [
  { value: 'eq', label: 'Equals (=)' },
  { value: 'neq', label: 'Not equal (≠)' },
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'At least (≥)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'At most (≤)' },
  { value: 'between', label: 'Between (inclusive)' },
]

export function FilterBuilder({
  properties,
  initialCondition,
  onApply,
  onClose,
}: {
  properties: readonly PropertyDefinition[]
  initialCondition?: NumericFilter
  onApply: (condition: NumericFilter) => void
  onClose: () => void
}) {
  const [propertyId, setPropertyId] = useState<PropertyId | ''>(initialCondition?.propertyId ?? properties[0]?.id ?? '')
  const [operator, setOperator] = useState<NumericFilter['operator']>(initialCondition?.operator ?? 'gte')
  const [value, setValue] = useState(initialCondition
    ? String(initialCondition.operator === 'between' ? initialCondition.min : initialCondition.value)
    : '')
  const [max, setMax] = useState(initialCondition?.operator === 'between' ? String(initialCondition.max) : '')
  const [error, setError] = useState('')
  const errorId = useId()

  function apply(event: FormEvent) {
    event.preventDefault()
    if (!propertyId) return
    const numericValue = Number(value)
    const numericMax = Number(max)
    if (!value.trim() || !Number.isFinite(numericValue)) {
      setError('Enter a valid number.')
      return
    }
    if (
      operator === 'between'
      && (!max.trim() || !Number.isFinite(numericMax) || numericMax < numericValue)
    ) {
      setError('Enter an upper bound greater than or equal to the lower bound.')
      return
    }
    onApply(
      operator === 'between'
        ? { propertyId, operator, min: numericValue, max: numericMax }
        : { propertyId, operator, value: numericValue },
    )
    onClose()
  }

  return (
    <form
      className="filter-editor"
      onSubmit={apply}
      noValidate
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="editor-heading">
        <strong>{initialCondition ? 'Edit condition' : 'Add a condition'}</strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Close filter editor"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="filter-fields">
        <label className="property-field">
          Property
          <select
            autoFocus
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value as PropertyId)}
          >
            {(['outputs', 'inputs'] as const).map((group) => (
              <optgroup key={group} label={group === 'outputs' ? 'Outputs' : 'Inputs'}>
                {properties
                  .filter((property) => property.group === group)
                  .map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label>
          Condition
          <select
            value={operator}
            onChange={(event) => {
              setOperator(event.target.value as NumericFilter['operator'])
              setError('')
            }}
          >
            {operatorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          {operator === 'between' ? 'Lower bound' : 'Value'}
          <input
            type="number"
            step="any"
            value={value}
            placeholder="e.g. 14"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setValue(event.target.value)
              setError('')
            }}
          />
        </label>

        {operator === 'between' && (
          <label>
            Upper bound
            <input
              type="number"
              step="any"
              value={max}
              placeholder="e.g. 20"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setMax(event.target.value)
                setError('')
              }}
            />
          </label>
        )}

        <button className="button primary" disabled={!propertyId} type="submit">
          {initialCondition ? 'Save changes' : 'Apply filter'}
        </button>
        {initialCondition && (
          <button className="button" type="button" onClick={onClose}>
            Cancel
          </button>
        )}
      </div>

      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
