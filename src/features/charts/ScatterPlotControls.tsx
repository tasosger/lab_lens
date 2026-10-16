import type { AxisSwap, ChartType, ChartAxes } from '../../chart-model/types.ts'
import { PropertySelect } from '../../components/PropertySelect'
import type { PropertyDefinition, PropertyId } from '../../data'
import { AxisSwapMenu } from './AxisSwapMenu'
import { ChartTypeSelect } from './ChartTypeSelect'

/** Scatterplots use two properties, one for each axis. */
export function ScatterPlotControls({ properties, axes, onAxisChange, onSwapAxes, onTypeChange }: {
  onTypeChange: (type: ChartType) => void
  properties: readonly PropertyDefinition[]
  axes: ChartAxes
  onAxisChange: (axis: 'x' | 'y', propertyId: PropertyId) => void
  onSwapAxes: (pair: AxisSwap) => void
}) {
  const activeIds = [axes.x, axes.y]
  const hasValidAxes = activeIds.every(id => properties.some(property => property.id === id))

  return (
    <div className="chart-controls">
      <ChartTypeSelect value="scatterplot" onChange={onTypeChange} />
      <PropertySelect label="X axis" properties={properties} value={axes.x} onChange={id => onAxisChange('x', id)} />
      <PropertySelect label="Y axis" properties={properties} value={axes.y} onChange={id => onAxisChange('y', id)} />
      <AxisSwapMenu threeDimensional={false} disabled={!hasValidAxes} onSwap={onSwapAxes} />
    </div>
  )
}
