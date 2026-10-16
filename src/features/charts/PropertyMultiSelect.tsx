import type { PropertyDefinition, PropertyId } from '../../data'

export function PropertyMultiSelect({ label, properties, value, onChange, ordered = false }: {
  label: string
  properties: readonly PropertyDefinition[]
  value: readonly PropertyId[]
  onChange: (ids: PropertyId[]) => void
  ordered?: boolean
}) {
  const selected = new Set(value)
  const move = (index: number, direction: number) => {
    const next = [...value]
    const destination = index + direction
    if (destination < 0 || destination >= next.length) return
    ;[next[index], next[destination]] = [next[destination]!, next[index]!]
    onChange(next)
  }
  return <details className="property-multi-select">
    <summary>{label}<span>{value.length} selected</span></summary>
    <div className="property-multi-body">
      <div className="property-multi-actions" aria-label={`${label} presets`}>
        <button className="text-button" onClick={() => onChange(properties.filter(p => p.group === 'inputs').map(p => p.id))}>Inputs only</button>
        <button className="text-button" onClick={() => onChange(properties.filter(p => p.group === 'outputs').map(p => p.id))}>Outputs only</button>
        <button className="text-button" onClick={() => onChange(properties.map(p => p.id))}>All</button>
        <button className="text-button" onClick={() => onChange([])}>Clear</button>
      </div>
      {ordered && value.length > 0 && <ol className="property-axis-order" aria-label="Axis order, left to right">
        {value.map((id, index) => {
          const property = properties.find(p => p.id === id)
          return <li key={id}><span>{property?.name ?? id} <small>({property?.group === 'inputs' ? 'Input' : 'Output'})</small></span>
            <button className="text-button" disabled={index === 0} aria-label={`Move ${property?.name} earlier`} onClick={() => move(index, -1)}>←</button>
            <button className="text-button" disabled={index === value.length - 1} aria-label={`Move ${property?.name} later`} onClick={() => move(index, 1)}>→</button>
          </li>
        })}
      </ol>}
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
