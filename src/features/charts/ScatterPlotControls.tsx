import { useId, useRef, useState } from 'react'
import { PropertySelect } from '../../components/PropertySelect'
import type { PropertyDefinition, PropertyId } from '../../data'
import { Icon } from '../experiments/Icon'
import { AxisSwapMenu, type AxisSwap } from './AxisSwapMenu'
import { SCATTERPLOT_VALUE_LIMIT, scatterplotModeForValueCount, type ChartType } from './chartConfiguration'
import { ChartTypeSelect } from './ChartTypeSelect'
import type { ChartAxes } from './scatterData'

/** One scatterplot type: two axis values render in 2D; a third adds depth. */
export function ScatterPlotControls({ properties, axes, mode, zPropertyId, onModeChange, onAxisChange, onZChange, onSwapAxes, onTypeChange }: {
  onTypeChange: (type: ChartType) => void
  properties: readonly PropertyDefinition[]
  axes: ChartAxes
  mode: '2d' | '3d'
  zPropertyId: PropertyId | null
  onModeChange: (mode: '2d' | '3d') => void
  onAxisChange: (axis: 'x' | 'y', propertyId: PropertyId) => void
  onZChange: (id: PropertyId) => void
  onSwapAxes: (pair: AxisSwap) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  const addButton = useRef<HTMLButtonElement>(null)
  const valueCount = mode === '3d' ? 3 : 2
  const visibleError = mode === '3d' ? error : null
  const activeIds = mode === '3d' ? [axes.x, axes.y, zPropertyId] : [axes.x, axes.y]
  const hasValidAxes = activeIds.every(id => properties.some(property => property.id === id))

  function addValue() {
    try {
      const nextMode = scatterplotModeForValueCount(valueCount + 1)
      setError(null)
      onModeChange(nextMode)
    } catch (error) {
      if (!(error instanceof RangeError)) throw error
      setError(error.message)
    }
  }

  return (
    <div className="chart-controls">
      <ChartTypeSelect value="scatterplot" onChange={onTypeChange} />
      <PropertySelect label="X axis" properties={properties} value={axes.x} onChange={id => onAxisChange('x', id)} />
      <PropertySelect label="Y axis" properties={properties} value={axes.y} onChange={id => onAxisChange('y', id)} />
      {mode === '3d' && (
        <div className="chart-axis-control">
          <PropertySelect label="Z axis" properties={properties} value={zPropertyId} onChange={onZChange} />
          <button type="button" className="icon-button chart-remove-value" aria-label="Remove Z axis" title="Remove Z axis" onClick={() => {
            setError(null)
            onModeChange(scatterplotModeForValueCount(valueCount - 1))
            addButton.current?.focus()
          }}><Icon name="close" /></button>
        </div>
      )}
      <div className="chart-value-actions">
        <button ref={addButton} type="button" className="button" disabled={!properties.length} aria-describedby={visibleError ? errorId : undefined} onClick={addValue}>
          Add value <span className="chart-value-count">{valueCount}/{SCATTERPLOT_VALUE_LIMIT}</span>
        </button>
        <AxisSwapMenu key={mode} threeDimensional={mode === '3d'} disabled={!hasValidAxes} onSwap={onSwapAxes} />
      </div>
      {visibleError && <p id={errorId} className="chart-value-error" role="alert">{visibleError}</p>}
    </div>
  )
}
