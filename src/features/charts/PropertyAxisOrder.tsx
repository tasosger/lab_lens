import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { reorderById } from '../../components/reorder'
import { useSortableGrid } from '../../components/useSortableGrid'
import type { PropertyDefinition, PropertyId } from '../../data'

export function PropertyAxisOrder({ properties, value, onChange, scrollContainer }: {
  properties: readonly PropertyDefinition[]
  value: readonly PropertyId[]
  onChange: (ids: PropertyId[]) => void
  scrollContainer: RefObject<HTMLElement | null>
}) {
  const items = value.map(id => {
    const property = properties.find(item => item.id === id)
    const group = property?.group === 'inputs' ? 'Input' : 'Output'
    return { id, name: property?.name ?? id, group, title: `${property?.name ?? id} (${group})` }
  })
  const sortable = useSortableGrid<HTMLOListElement>(items,
    (id, targetId) => onChange(reorderById(items, id, targetId).map(item => item.id)),
    { itemLabel: 'Axis', scrollContainer })
  const from = value.findIndex(id => id === sortable.drag?.id)
  const to = value.findIndex(id => id === sortable.drag?.targetId)

  return <>
    <p id={sortable.instructionsId} className="sr-only">Drag axes to change their left-to-right order.
      Keyboard: focus a handle and use arrow keys or Home/End. Escape cancels a drag.
    </p>
    <p className="sr-only" role="status" aria-live="polite">{sortable.announcement}</p>
    <ol ref={sortable.container} className={`property-axis-order${sortable.drag ? ' is-dragging' : ''}`} aria-label="Axis order, left to right">
      {items.map(item => <li key={item.id} data-sortable-id={item.id} data-dragging={sortable.drag?.id === item.id}
        data-drop={sortable.drag?.targetId === item.id && from !== to ? from < to ? 'after' : 'before' : undefined}>
        <button type="button" className="property-axis-drag-handle" title="Drag to rearrange axis" {...sortable.handleProps(item.id)}>
          <svg width="14" height="18" viewBox="0 0 18 22" fill="currentColor" aria-hidden="true">
            {[5, 11, 17].flatMap(y => [5, 12].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
          </svg>
        </button>
        <span>{item.name} <small>({item.group})</small></span>
      </li>)}
    </ol>
    {sortable.drag && createPortal(<div className="property-axis-drag-preview" aria-hidden="true"
      style={{ left: sortable.drag.x + 12, top: sortable.drag.y + 12 }}>
      {items.find(item => item.id === sortable.drag?.id)?.title}
      <small>{to >= 0 && to !== from ? `Release to move to position ${to + 1}` : 'Drag over another axis'}</small>
    </div>, document.body)}
  </>
}
