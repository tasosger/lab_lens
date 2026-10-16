import { useId, useMemo, useReducer, useState, type FormEvent } from 'react'
import { sortedPropertyValues, type Experiment, type FilterScale, type NumericFilter, type PropertyDefinition } from '../../data'
import { queryExperiments } from '../../data/query'
import { absoluteRangeWarning, parseFilterInput, type ThresholdField } from './filterInput'
import { createFilterDraft, reduceFilterDraft } from './filterDraft'
import { FilterPropertyPicker } from './FilterPropertyPicker'
import './filters.css'

const operatorOptions: { value: NumericFilter['operator']; label: string }[] = [
  { value: 'gte', label: 'At least' },
  { value: 'lte', label: 'At most' },
  { value: 'between', label: 'Between' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equal to' },
]

export function FilterBuilder({ properties, experiments, initialCondition, onApply, onClose }: {
  properties: readonly PropertyDefinition[]
  experiments: readonly Experiment[]
  initialCondition?: NumericFilter
  onApply: (condition: NumericFilter) => void
  onClose: () => void
}) {
  const [draft, dispatch] = useReducer(reduceFilterDraft, undefined, () => createFilterDraft(properties[0]?.id ?? '', initialCondition))
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<ThresholdField, boolean>>>({})
  const errorId = useId()
  const warningId = useId()
  const titleId = useId()
  const { propertyId, scale, operator } = draft
  const { value, max } = draft.thresholds
  const property = properties.find(item => item.id === propertyId)
  const distribution = useMemo(() => property ? sortedPropertyValues(experiments, property) : [], [experiments, property])
  const propertiesById = useMemo(() => new Map(properties.map(item => [item.id, item])), [properties])
  const parsed = parseFilterInput({ propertyId, operator, scale, value, max })
  const matched = property && 'condition' in parsed ? queryExperiments(experiments, propertiesById, { filters: [parsed.condition] }).length : undefined
  const validation = 'error' in parsed && (!parsed.incomplete || submitted || parsed.fields.some(field => touched[field])) ? parsed : undefined
  const warning = 'condition' in parsed ? absoluteRangeWarning(parsed.condition, distribution) : ''
  const describedBy = validation ? errorId : warning ? warningId : undefined
  const inputProps = (field: ThresholdField) => ({
    'aria-invalid': Boolean(validation?.fields.includes(field)),
    'aria-describedby': describedBy,
    onBlur: () => setTouched(previous => ({ ...previous, [field]: true })),
  })

  function apply(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if ('error' in parsed) return
    onApply(parsed.condition)
    onClose()
  }

  return <form className="filter-composer" aria-labelledby={titleId} onSubmit={apply} noValidate onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
  }}>
    <div className="filter-composer-heading">
      <strong id={titleId}>{initialCondition ? 'Edit filter' : 'Add filter'}</strong>
    </div>
    <div className="filter-composer-fields">
      <FilterPropertyPicker properties={properties} value={propertyId} onChange={id => dispatch({ type: 'property', propertyId: id })} />
      <label>Condition<select value={operator} onChange={event => dispatch({ type: 'operator', operator: event.target.value as NumericFilter['operator'] })}>
        {operatorOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <label className="filter-value-type">Value type<select value={scale} onChange={event => dispatch({ type: 'scale', scale: event.target.value as FilterScale })}>
        <option value="absolute">Absolute</option><option value="percentile">Percentile</option>
      </select></label>
      <div className="filter-thresholds">
        <label>{operator === 'between' ? 'From value' : 'Value'}
          <input type="number" step="any" min={scale === 'percentile' ? 0 : undefined} max={scale === 'percentile' ? 100 : undefined}
            value={value} placeholder="Enter value" {...inputProps('value')}
            onChange={event => dispatch({ type: 'threshold', field: 'value', value: event.target.value })} />
        </label>
        {operator === 'between' && <label>To value
          <input type="number" step="any" min={scale === 'percentile' ? 0 : undefined} max={scale === 'percentile' ? 100 : undefined}
            value={max} placeholder="Enter value" {...inputProps('max')}
            onChange={event => dispatch({ type: 'threshold', field: 'max', value: event.target.value })} />
        </label>}
      </div>
    </div>
    {validation && <p className="field-error" id={errorId} role="alert">{validation.error}</p>}
    {warning && <p className="filter-range-warning" id={warningId} role="status">Warning: {warning}</p>}
    <div className="filter-composer-footer">
      <p role="status" aria-live="polite" className={matched === 0 ? 'filter-no-matches' : ''}>
        {matched === undefined ? 'Enter a threshold to preview matches.' : <><strong>{matched}</strong> of {experiments.length} experiments match this condition</>}
      </p>
      <div className="filter-composer-actions">
        <button className="button" type="button" onClick={onClose}>Cancel</button>
        <button className="button primary" disabled={!property || 'error' in parsed} type="submit">{initialCondition ? 'Save changes' : 'Add filter'}</button>
      </div>
    </div>
  </form>
}
