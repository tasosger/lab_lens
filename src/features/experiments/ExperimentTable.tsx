import { getPropertyValue, type ExperimentList, type ExperimentSort, type PropertyDefinition } from '../../data'
import { formatValue } from '../../format.ts'
import { Icon } from '../../components/Icon'

export function ExperimentTable({ results, visibleProperties, sort, selectedIds, selectionFull, isFiltered, onSort, onSelect, onOpen, onResetQuery }: {
  results: ExperimentList
  visibleProperties: readonly PropertyDefinition[]
  sort: ExperimentSort
  selectedIds: readonly string[]
  selectionFull: boolean
  isFiltered: boolean
  onSort: (field: ExperimentSort['field']) => void
  onSelect: (id: string) => void
  onOpen: (id: string) => void
  onResetQuery: () => void
}) {
  const selected = new Set(selectedIds)
  function sortHeader(field: ExperimentSort['field'], label: string) {
    const active = sort.field === field
    return (
      <button
        className={`sort-button ${active ? 'sort-active' : ''}`}
        onClick={() => onSort(field)}
        aria-label={`Sort by ${label} ${active && sort.direction === 'asc' ? 'descending' : 'ascending'}`}
      >
        <span>{label}</span>
        <Icon
          name="arrow"
          className={active && sort.direction === 'asc' ? 'ascending' : ''}
        />
      </button>
    )
  }

  return (
    <>
      <div
        className="table-scroll"
        id="experiments"
        role="region"
        aria-label="Experiment results, scroll for more rows or columns"
        tabIndex={0}
      >
        <table className="experiment-table">
          <caption className="sr-only">
            Experiments and their measured properties. Use experiment names to open details.
          </caption>
          <thead>
            <tr>
              <th className="selection-cell">
                <span className="sr-only">Selection</span>
              </th>
              <th
                className="identity-cell"
                scope="col"
                aria-sort={sort.field === 'id'
                  ? (sort.direction === 'asc' ? 'ascending' : 'descending')
                  : 'none'}
              >
                {sortHeader('id', 'Experiment name')}
              </th>
              {visibleProperties.map((property) => (
                <th
                  key={property.id}
                  className="numeric-cell"
                  scope="col"
                  aria-sort={sort.field === property.id
                    ? (sort.direction === 'asc' ? 'ascending' : 'descending')
                    : 'none'}
                >
                  <span className="column-group">
                    {property.group === 'outputs' ? 'Output' : 'Input'}
                  </span>
                  {sortHeader(property.id, property.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.items.map((experiment) => {
              const isSelected = selected.has(experiment.id)
              return (
                <tr key={experiment.id} className={isSelected ? 'selected-row' : ''}>
                  <td className="selection-cell">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={selectionFull && !isSelected}
                      aria-label={`Select ${experiment.id}`}
                      aria-describedby={selectionFull && !isSelected
                        ? 'selection-limit'
                        : undefined}
                      onChange={() => onSelect(experiment.id)}
                    />
                  </td>
                  <th className="identity-cell" scope="row">
                    <button
                      className="experiment-link"
                      onClick={() => onOpen(experiment.id)}
                    >
                      {experiment.id}
                      <Icon name="chevron" />
                    </button>
                  </th>
                  {visibleProperties.map((property) => (
                    <td key={property.id} className="numeric-cell">
                      {formatValue(getPropertyValue(experiment, property))}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>

        {results.matched === 0 && (
          <div className="empty-state">
            <span className="empty-icon"><Icon name="search" /></span>
            <h3>
              {results.total === 0 ? 'No experiments available' : 'No matching experiments'}
            </h3>
            <p>
              {results.total === 0
                ? 'The dataset does not contain any experiments yet.'
                : 'Try a different name or adjust your filter conditions.'}
            </p>
            {isFiltered && (
              <button
                className="button"
                onClick={onResetQuery}
              >
                Reset search and filters
              </button>
            )}
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>Open an experiment for details. Click a heading to sort.</span>
        <span>— indicates a missing value</span>
      </div>
    </>
  )
}
