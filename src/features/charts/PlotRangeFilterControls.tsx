import { CartesianRangeEditor } from '../../charts/CartesianRangeEditor'
import type { PropertyDefinition } from '../../data'
import { describeFilterExpression } from '../experiments/filterTree'
import { propertyRangeConditions, type PropertyRangeFilter } from './propertyRangeFilter'

export function PlotRangeFilterControls({ filter, properties, onChange }: {
  filter: PropertyRangeFilter
  properties: readonly PropertyDefinition[]
  onChange: (filter: PropertyRangeFilter | null) => void
}) {
  const label = (id: string) => properties.find((property) => property.id === id)?.name ?? id
  return (
    <div className="plot-filter-controls">
      <div className="plot-filter-heading">
        <p><strong>Plot range</strong> · {propertyRangeConditions(filter).map((condition) => describeFilterExpression(condition, properties)).join(' AND ')}</p>
        <button className="text-button" onClick={() => onChange(null)}>Clear plot range</button>
      </div>
      <details>
        <summary>Edit plot range</summary>
        <CartesianRangeEditor value={filter.range} xLabel={label(filter.xPropertyId)} yLabel={label(filter.yPropertyId)}
          onApply={(range) => onChange({ ...filter, range })} />
      </details>
    </div>
  )
}
