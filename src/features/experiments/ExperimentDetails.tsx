import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { getPropertyValue, type Experiment, type PropertyDefinition, type PropertyStatistics } from '../../data'
import { AverageReference } from './AverageReference'
import { formatValue } from './format'
import { Icon } from './Icon'
import { useResizableDrawer } from './useResizableDrawer'
import { SELECTION_LIMIT } from './workspaceReducer'

function DetailsSection({ title, count, children }: {
  title: string
  count: number
  children: ReactNode
}) {
  const id = useId()

  return (
    <section className="details-section" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`} className="details-section-heading">
        <span>{title}</span>
        <span className="details-section-count">{count} {count === 1 ? 'property' : 'properties'}</span>
      </h3>
      {children}
    </section>
  )
}

export function ExperimentDetails({
  experiment,
  properties,
  statistics,
  datasetCount,
  selected,
  selectionFull,
  hidden,
  onToggleSelection,
  onClose,
}: {
  experiment: Experiment
  properties: readonly PropertyDefinition[]
  statistics: readonly PropertyStatistics[]
  datasetCount: number
  selected: boolean
  selectionFull: boolean
  hidden: boolean
  onToggleSelection: () => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { width, resizing, handleProps } = useResizableDrawer()
  const statisticsById = new Map(statistics.map((reference) => [reference.propertyId, reference]))
  const sections = [
    { title: 'Measured outputs', className: 'output-cards', properties: properties.filter((property) => property.group === 'outputs') },
    { title: 'Ingredients', className: 'property-list', properties: properties.filter((property) => property.category === 'ingredient') },
    { title: 'Process conditions', className: 'property-list', properties: properties.filter((property) => property.category === 'process') },
  ]

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const element = dialog.current
    element?.showModal()
    return () => {
      element?.close()
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      id="experiment-details"
      className={`details-dialog${resizing ? ' details-dialog-resizing' : ''}`}
      style={{ '--details-width': `${width}px` } as CSSProperties}
      aria-labelledby="details-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left
          || event.clientX > rect.right
          || event.clientY < rect.top
          || event.clientY > rect.bottom
        ) {
          onClose()
        }
      }}
    >
      <div className="details-resize-handle" {...handleProps} />
      <div className="details-heading">
        <div>
          <p className="eyebrow">EXPERIMENT DETAILS</p>
          <h2 id="details-title">{experiment.id}</h2>
        </div>
        <div className="details-heading-actions">
          <button
            autoFocus
            className="icon-button"
            onClick={onClose}
            aria-label="Close experiment details"
          >
            <Icon name="close" />
          </button>
        </div>
      </div>

      <div className="details-content">
        {hidden && (
          <p className="notice">
            This experiment is outside your current search or filters.
          </p>
        )}

        <div className="dataset-reference-note">
          <strong>Reference: full dataset · {datasetCount} experiments</strong>
          <p>Averages include zero values and exclude missing measurements.</p>
        </div>

        {sections.map((section) => (
          <DetailsSection key={section.title} title={section.title} count={section.properties.length}>
            <dl className={section.className}>
              {section.properties.map((property) => {
                const value = getPropertyValue(experiment, property)
                return (
                  <div key={property.id}>
                    <dt>{property.name}</dt>
                    <dd>
                      <span className="measurement-value">{formatValue(value)}</span>
                      <AverageReference value={value} reference={statisticsById.get(property.id)} />
                    </dd>
                  </div>
                )
              })}
            </dl>
          </DetailsSection>
        ))}

        <p className="data-note">
          Values are shown as supplied. Measurement units were not provided.
        </p>
      </div>

      <div className="details-footer">
        <span>
          {selectionFull && !selected
            ? 'Remove a selection to add another.'
            : `Select up to ${SELECTION_LIMIT} experiments for comparison.`}
        </span>
        <button
          className={`button ${selected ? '' : 'primary'}`}
          disabled={selectionFull && !selected}
          onClick={onToggleSelection}
        >
          {selected && <Icon name="check" />}
          {selected ? 'Remove from selection' : 'Select experiment'}
        </button>
      </div>
    </dialog>
  )
}
