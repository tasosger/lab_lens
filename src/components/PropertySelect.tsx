import { useId } from 'react'
import type { PropertyDefinition, PropertyId } from '../data'
import './propertySelect.css'

/** Shared single-property picker; group-qualified IDs distinguish duplicate names. */
export function PropertySelect({ label, properties, value, onChange }: {
  label: string
  properties: readonly PropertyDefinition[]
  value: PropertyId | null
  onChange: (id: PropertyId) => void
}) {
  const id = useId()
  return (
    <label className="property-select" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value ?? ''} disabled={!properties.length} onChange={(event) => {
        const property = properties.find((item) => item.id === event.target.value)
        if (property) onChange(property.id)
      }}>
        {value === null && <option value="">Choose a property</option>}
        {(['inputs', 'outputs'] as const).map((group) => (
          <optgroup key={group} label={group === 'inputs' ? 'Inputs' : 'Outputs'}>
            {properties.filter((property) => property.group === group).map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
