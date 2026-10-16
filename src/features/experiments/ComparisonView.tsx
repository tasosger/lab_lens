import { compareExperiments, type Experiment, type PropertyDefinition } from '../../data'
import { formatValue } from './format'
import { compareWithAverage } from './averageComparison'
import { Icon } from './Icon'
import './comparison.css'

interface ComparisonViewProps {
  experiments: readonly Experiment[]
  properties: readonly PropertyDefinition[]
  baselineId: string | null
  differencesOnly: boolean
  hiddenCount: number
  onBaseline: (id: string) => void
  onDifferencesOnly: (value: boolean) => void
  onRemove: (id: string) => void
  onOpen: (id: string) => void
  onExplore: () => void
}

function ComparisonDelta({ value, reference, delta }: {
  value: number | undefined
  reference: number | undefined
  delta: number | undefined
}) {
  // Suppress subtraction noise in the display without rounding the stored comparison.
  const difference = delta !== undefined && compareWithAverage(value, reference) === 'equal' ? 0 : delta
  const formatted = difference === undefined ? undefined : `${difference > 0 ? '+' : ''}${formatValue(difference)}`
  return <span
    className={`comparison-delta ${difference === undefined || difference === 0
      ? '' : difference > 0 ? 'delta-positive' : 'delta-negative'}`}
    aria-label={formatted === undefined ? 'Difference from baseline unavailable' : `Difference from baseline: ${formatted}`}
  >
    {formatted === undefined ? 'Δ unavailable' : `Δ ${formatted}`}
  </span>
}

export function ComparisonView({
  experiments,
  properties,
  baselineId,
  differencesOnly,
  hiddenCount,
  onBaseline,
  onDifferencesOnly,
  onRemove,
  onOpen,
  onExplore,
}: ComparisonViewProps) {
  const comparison = compareExperiments(experiments, properties, baselineId)
  const differingCount = comparison.rows.filter((row) => row.differs).length
  const visibleRows = comparison.rows.filter((row) => !differencesOnly || row.differs)

  if (experiments.length < 2) {
    return (
      <section id="comparison" className="experiment-card comparison-empty" aria-label="Experiment comparison">
        <span className="empty-icon"><Icon name="columns" /></span>
        <h2>{experiments.length ? 'Select one more experiment' : 'Choose experiments to compare'}</h2>
        <p>Select at least two experiments using the checkboxes in the experiment table.</p>
        <button className="button primary" onClick={onExplore}>Choose experiments</button>
      </section>
    )
  }

  return (
    <section id="comparison" className="experiment-card" aria-label="Experiment comparison">
      <div className="comparison-toolbar">
        <label className="comparison-baseline">
          Baseline experiment
          <select
            value={comparison.baselineId ?? ''}
            onChange={(event) => onBaseline(event.target.value)}
          >
            {experiments.map((experiment) => (
              <option key={experiment.id} value={experiment.id}>{experiment.id}</option>
            ))}
          </select>
        </label>
        <label className="comparison-toggle">
          <input
            type="checkbox"
            checked={differencesOnly}
            onChange={(event) => onDifferencesOnly(event.target.checked)}
          />
          Show differences only
        </label>
        <button className="icon-button comparison-edit" aria-label="Edit selection" title="Edit selection" onClick={onExplore}>
          <Icon name="edit" />
        </button>
      </div>

      <div className="comparison-summary">
        <p role="status">
          <strong>{experiments.length} experiments</strong>
          {' · '}{differingCount} of {comparison.rows.length} properties differ
          {' · '}{visibleRows.length} shown
        </p>
        {hiddenCount > 0 && (
          <p>{hiddenCount} selected {hiddenCount === 1 ? 'experiment is' : 'experiments are'} outside your Explore search or filters.</p>
        )}
      </div>

      {visibleRows.length === 0 ? (
        <div className="comparison-empty">
          <h2>{differencesOnly ? 'No differing properties' : 'No recorded properties'}</h2>
          <p>{differencesOnly
            ? 'These experiments have the same values for every recorded property.'
            : 'The selected experiments do not have inputs or outputs to compare.'}</p>
          {differencesOnly && (
            <button className="button" onClick={() => onDifferencesOnly(false)}>Show all properties</button>
          )}
        </div>
      ) : (
        <div
          className="comparison-scroll"
          role="region"
          aria-label="Comparison table, scroll for more properties or experiments"
          tabIndex={0}
        >
          <table className="comparison-table">
            <caption className="sr-only">
              Selected experiments, with outputs followed by inputs. Delta is the value minus the baseline.
              Highlighted rows contain differing values. Missing values are shown as an em dash.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="comparison-property">Property</th>
                {experiments.map((experiment) => (
                  <th key={experiment.id} scope="col">
                    <div className="comparison-experiment">
                      <button className="comparison-name" onClick={() => onOpen(experiment.id)}>
                        {experiment.id}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${experiment.id} from comparison`}
                        onClick={() => onRemove(experiment.id)}
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                    <span className={experiment.id === comparison.baselineId ? 'reference-label' : 'comparison-column-note'}>
                      {experiment.id === comparison.baselineId ? 'Reference' : 'Value and change from baseline'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            {(['outputs', 'inputs'] as const).map((group) => {
              const rows = visibleRows.filter((row) => row.property.group === group)
              if (!rows.length) return null
              return (
                <tbody key={group}>
                  <tr className="comparison-group">
                    <th colSpan={experiments.length + 1} scope="rowgroup">
                      {group === 'outputs' ? 'Measured outputs' : 'Inputs'}
                    </th>
                  </tr>
                  {rows.map((row) => (
                    <tr key={row.property.id} className={row.differs ? 'comparison-differs' : ''}>
                      <th scope="row" className="comparison-property">
                        {row.property.name}
                        {row.differs && <span className="comparison-difference-label">Differs</span>}
                      </th>
                      {row.values.map((cell) => (
                        <td key={cell.experimentId}>
                          <span className="comparison-value">{formatValue(cell.value)}</span>
                          {cell.experimentId === comparison.baselineId ? (
                            <span className="comparison-delta">Reference</span>
                          ) : (
                            <ComparisonDelta value={cell.value} delta={cell.delta}
                              reference={row.values.find(value => value.experimentId === comparison.baselineId)?.value} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )
            })}
          </table>
        </div>
      )}
      <div className="table-footer comparison-notes">
        <span>Δ = experiment value − baseline value. Higher and lower do not indicate better or worse.</span>
        <span>— = missing value. Δ is unavailable if either value is missing or the difference exceeds the numeric range.</span>
      </div>
    </section>
  )
}
