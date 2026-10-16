import type { PropertyDefinition } from '../../data'
import { countConditions, describeFilterExpression, isAppliedGroup, type AppliedFilterGroup } from './filterTree'
import './filters.css'

export function FilterSummary({ group, properties, onEdit, nested = false }: {
  group: AppliedFilterGroup
  properties: readonly PropertyDefinition[]
  onEdit: (id: number) => void
  nested?: boolean
}) {
  const filters = group.filters.filter(node => !isAppliedGroup(node) || countConditions(node) > 0)
  return <span className={nested ? 'filter-summary-group' : 'filter-summary'} role="group"
    aria-label={group.operator === 'and' ? 'All of these filters' : 'Any of these filters'}>
    {filters.map((node, index) => <span className="filter-summary-item" key={node.id}>
      {index > 0 && <span className="filter-summary-join">{group.operator === 'and' ? 'and' : 'or'}</span>}
      {isAppliedGroup(node) ? <FilterSummary group={node} properties={properties} onEdit={onEdit} nested /> :
        <button type="button" className="filter-summary-chip" aria-label={'Edit filter ' + describeFilterExpression(node.condition, properties)}
          onClick={() => onEdit(node.id)}>{describeFilterExpression(node.condition, properties)}</button>}
    </span>)}
  </span>
}
