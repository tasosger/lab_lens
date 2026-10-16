import { useEffect, useId, useMemo, useReducer, useRef, useState, type FormEvent } from 'react'
import { percentileValue, sortedPropertyValues, type Experiment, type FilterScale, type NumericFilter, type PropertyDefinition } from '../../data'
import { queryExperiments } from '../../data/query'
import { formatValue } from '../../format'
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

export function FilterBuilder({ properties, experiments, initialCondition, previewCondition, onApply, onClose }: {
  properties: readonly PropertyDefinition[]
  experiments: readonly Experiment[]
  initialCondition?: NumericFilter
  previewCondition?: (condition: NumericFilter) => number
  onApply: (condition: NumericFilter) => void
  onClose: () => void
}) {
  const [draft, dispatch] = useReducer(reduceFilterDraft, undefined, () => createFilterDraft('', initialCondition))
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<ThresholdField, boolean>>>({})
  const errorId = useId()
  const warningId = useId()
  const titleId = useId()
  const hintId = useId()
  const valueInput = useRef<HTMLInputElement>(null)
  const { propertyId, scale, operator } = draft
  const { value, max } = draft.thresholds
  const property = properties.find(item => item.id === propertyId)
  const distribution = useMemo(() => property ? sortedPropertyValues(experiments, property) : [], [experiments, property])
  const propertiesById = useMemo(() => new Map(properties.map(item => [item.id, item])), [properties])
  const parsed = parseFilterInput({ propertyId, operator, scale, value, max })
  const matched = property && 'condition' in parsed
    ? previewCondition ? previewCondition(parsed.condition) : queryExperiments(experiments, propertiesById, { filters: [parsed.condition] }).length
    : undefined
  const validation = 'error' in parsed && (!parsed.incomplete || submitted || parsed.fields.some(field => touched[field])) ? parsed : undefined
  const warning = 'condition' in parsed ? absoluteRangeWarning(parsed.condition, distribution) : ''
  const describedBy = validation ? errorId : warning ? warningId : hintId
  useEffect(() => {
    if (propertyId) { valueInput.current?.focus(); valueInput.current?.select() }
  }, [propertyId])
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

  return <form className="filter-composer" data-choosing-property={!property} aria-labelledby={titleId} onSubmit={apply} noValidate onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
  }}>
    <span className="sr-only" id={titleId}>{initialCondition ? 'Edit filter' : 'Add filter'}</span>
    <div className="filter-composer-fields">
      <FilterPropertyPicker properties={properties} value={propertyId} autoOpen={!initialCondition} onChange={id => dispatch({ type: 'property', propertyId: id })} />
      {property && <>
        <label>Condition<select value={operator} onChange={event => dispatch({ type: 'operator', operator: event.target.value as NumericFilter['operator'] })}>
          {operatorOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        <div className="filter-value-fields">
          <div className="filter-value-heading"><span>{operator === 'between' ? 'Range' : 'Value'}</span>
            <label className="filter-value-type"><span className="sr-only">Value type</span><select value={scale} onChange={event => dispatch({ type: 'scale', scale: event.target.value as FilterScale })}>
              <option value="absolute">Absolute</option><option value="percentile">Percentile</option>
            </select></label>
          </div>
          <div className="filter-thresholds">
            <label><span className="sr-only">{operator === 'between' ? 'From value' : 'Value'}</span>
              <input ref={valueInput} type="number" step="any" min={scale === 'percentile' ? 0 : undefined} max={scale === 'percentile' ? 100 : undefined}
                value={value} placeholder={scale === 'percentile' ? '0–100' : 'Enter value'} {...inputProps('value')}
                onChange={event => dispatch({ type: 'threshold', field: 'value', value: event.target.value })} />
            </label>
            {operator === 'between' && <><span className="filter-range-separator">to</span><label><span className="sr-only">To value</span>
              <input type="number" step="any" min={scale === 'percentile' ? 0 : undefined} max={scale === 'percentile' ? 100 : undefined}
                value={max} placeholder={scale === 'percentile' ? '0–100' : 'Enter value'} {...inputProps('max')}
                onChange={event => dispatch({ type: 'threshold', field: 'max', value: event.target.value })} />
            </label></>}
          </div>
          <p className="filter-value-hint" id={hintId}>
            {scale === 'absolute'
              ? distribution.length ? `Observed: ${formatValue(distribution[0])} to ${formatValue(distribution.at(-1))}` : 'No measured values'
              : 'condition' in parsed && distribution.length
                ? operator === 'between'
                  ? `P${value}–P${max} = ${formatValue(percentileValue(distribution, Number(value)))} to ${formatValue(percentileValue(distribution, Number(max)))}`
                  : `P${value} = ${formatValue(percentileValue(distribution, Number(value)))}`
                : 'Percentile from 0 to 100'}
          </p>
        </div>
      </>}
    </div>
    {validation && <p className="field-error" id={errorId} role="alert">{validation.error}</p>}
    {warning && <p className="filter-range-warning" id={warningId} role="status">Warning: {warning}</p>}
    <div className="filter-composer-footer">
      {property && <p role="status" aria-live="polite" className={matched === 0 ? 'filter-no-matches' : ''}>
        {matched === undefined ? 'Enter a value to preview results.' : <><strong>{matched}</strong> of {experiments.length} experiments {previewCondition ? 'after saving' : 'match this condition'}</>}
      </p>}
      <div className="filter-composer-actions">
        <button className="text-button" type="button" onClick={onClose}>Cancel</button>
        {property && <button className="button primary" disabled={'error' in parsed} type="submit">{initialCondition ? 'Save changes' : 'Add filter'}</button>}
      </div>
    </div>
  </form>
}
