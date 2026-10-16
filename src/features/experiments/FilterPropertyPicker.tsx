import { useEffect, useId, useRef, useState } from 'react'
import { useDetailsDropdown } from '../../components/useDetailsDropdown'
import type { PropertyDefinition, PropertyId } from '../../data'
import { Icon } from '../../components/Icon'

export function FilterPropertyPicker({ properties, value, onChange }: {
  properties: readonly PropertyDefinition[]
  value: PropertyId | ''
  onChange: (id: PropertyId) => void
}) {
  const dropdown = useDetailsDropdown()
  const search = useRef<HTMLInputElement>(null)
  const options = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const labelId = useId()
  const valueId = useId()
  const property = properties.find(item => item.id === value)
  const matches = properties.filter(item => `${item.name} ${item.group}`.toLowerCase().includes(query.trim().toLowerCase()))
  useEffect(() => { dropdown.trigger.current?.focus() }, [dropdown.trigger])

  function select(id: PropertyId) { onChange(id); dropdown.close(true) }

  return <div className="filter-property-picker">
    <span className="filter-field-label" id={labelId}>Property</span>
    <details {...dropdown.menuProps} onToggle={event => {
      if (event.currentTarget.open) { setQuery(''); search.current?.focus() }
    }}>
      <summary ref={dropdown.trigger} aria-labelledby={labelId + ' ' + valueId}>
        <span id={valueId}>{property?.name ?? 'Choose a property'}{property && <small>{property.group === 'inputs' ? 'Input' : 'Output'}</small>}</span>
        <Icon name="chevron" />
      </summary>
      <div className="filter-property-menu" role="group" aria-label="Choose a filter property">
        <label className="filter-property-search"><Icon name="search" /><span className="sr-only">Search properties</span>
          <input ref={search} type="search" value={query} placeholder="Search inputs and outputs…" onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') { event.preventDefault(); options.current?.querySelector<HTMLButtonElement>('button')?.focus() }
              if (event.key === 'Enter') { event.preventDefault(); if (matches.length === 1) select(matches[0]!.id) }
            }} />
        </label>
        <div ref={options} className="filter-property-options" onKeyDown={event => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
          event.preventDefault()
          if (event.key === 'ArrowUp' && index === 0) search.current?.focus()
          else buttons[Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus()
        }}>
          {(['outputs', 'inputs'] as const).map(group => {
            const items = matches.filter(item => item.group === group)
            return items.length > 0 && <div key={group} role="group" aria-label={group === 'inputs' ? 'Inputs' : 'Outputs'}>
              <p>{group === 'inputs' ? 'Inputs' : 'Outputs'}</p>
              {items.map(item => <button type="button" key={item.id} aria-pressed={item.id === value} onClick={() => select(item.id)}>
                <span>{item.name}</span>{item.id === value && <Icon name="check" />}
              </button>)}
            </div>
          })}
          {!matches.length && <p className="filter-property-empty">No properties found. Try another name.</p>}
        </div>
      </div>
    </details>
  </div>
}
