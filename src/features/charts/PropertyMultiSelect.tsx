import { useRef } from 'react'
import type { PropertyDefinition, PropertyId } from '../../data'
import { useDetailsDropdown } from '../../components/useDetailsDropdown'
import { PropertyAxisOrder } from './PropertyAxisOrder'

export function PropertyMultiSelect({ label, properties, value, onChange, ordered = false }: {
  label: string
  properties: readonly PropertyDefinition[]
  value: readonly PropertyId[]
  onChange: (ids: PropertyId[]) => void
  ordered?: boolean
}) {
  const dropdown = useDetailsDropdown()
  const panel = useRef<HTMLDivElement>(null)
  const selected = new Set(value)
  return <details {...dropdown.menuProps} className="property-multi-select">
    <summary ref={dropdown.trigger}>{label}<span>{value.length} selected</span></summary>
    <div ref={panel} className="property-multi-body">
      <div className="property-multi-actions" aria-label={`${label} presets`}>
        <button className="text-button" onClick={() => onChange(properties.filter(p => p.group === 'inputs').map(p => p.id))}>Inputs only</button>
        <button className="text-button" onClick={() => onChange(properties.filter(p => p.group === 'outputs').map(p => p.id))}>Outputs only</button>
        <button className="text-button" onClick={() => onChange(properties.map(p => p.id))}>All</button>
        <button className="text-button" onClick={() => onChange([])}>Clear</button>
      </div>
      {ordered && value.length > 0 && <PropertyAxisOrder properties={properties} value={value} onChange={onChange} scrollContainer={panel} />}
      <div className="property-multi-options">
        {(['inputs', 'outputs'] as const).map(group => <fieldset key={group}>
          <legend>{group === 'inputs' ? 'Inputs' : 'Outputs'}</legend>
          {properties.filter(p => p.group === group).map(property => <label key={property.id}>
            <input type="checkbox" checked={selected.has(property.id)} onChange={() => onChange(selected.has(property.id)
              ? value.filter(id => id !== property.id) : [...value, property.id])} />
            {property.name}
          </label>)}
        </fieldset>)}
      </div>
    </div>
  </details>
}
