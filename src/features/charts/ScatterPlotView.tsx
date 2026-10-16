import { ChartDataTable } from '../../charts/ChartDataTable'
import { ScatterPlot } from '../../charts/ScatterPlot'
import { ScatterPlot3D } from '../../charts/ScatterPlot3D'
import type { OrbitCamera } from '../../charts/projection3D'
import type { CartesianRange } from '../../charts/types'
import { PropertySelect } from '../../components/PropertySelect'
import type { Experiment, PropertyDefinition, PropertyId } from '../../data'
import { formatValue } from '../experiments/format'
import { Icon } from '../experiments/Icon'
import { buildScatterData, buildScatter3DData, type ChartAxes } from './scatterData'
import type { PropertyRangeFilter } from './propertyRangeFilter'
import './scatterView.css'

interface ScatterPlotViewProps {
  experiments: readonly Experiment[]
  matchingIds: readonly string[]
  rangeSelection: CartesianRange | null
  hasPlotFilter: boolean
  onPlotFilter: (filter: PropertyRangeFilter | null) => void
  properties: readonly PropertyDefinition[]
  axes: ChartAxes
  mode: '2d' | '3d'
  zPropertyId: PropertyId | null
  camera: OrbitCamera
  onModeChange: (mode: '2d' | '3d') => void
  onZChange: (id: PropertyId) => void
  onCameraChange: (camera: OrbitCamera) => void
  selectedIds: readonly string[]
  isFiltered: boolean
  onAxisChange: (axis: 'x' | 'y', propertyId: PropertyId) => void
  onSwapAxes: () => void
  onOpen: (id: string) => void
  onResetQuery: () => void
}

export function ScatterPlotView({ experiments, matchingIds, rangeSelection, hasPlotFilter, onPlotFilter, properties, axes, mode, zPropertyId, camera, onModeChange, onZChange, onCameraChange, selectedIds, isFiltered, onAxisChange, onSwapAxes, onOpen, onResetQuery }: ScatterPlotViewProps) {
  const xProperty = properties.find((property) => property.id === axes.x)
  const yProperty = properties.find((property) => property.id === axes.y)
  const zProperty = properties.find((property) => property.id === zPropertyId)
  const data3D = mode === '3d' && xProperty && yProperty && zProperty ? buildScatter3DData(experiments, xProperty, yProperty, zProperty) : undefined
  const data = mode === '3d' ? data3D : xProperty && yProperty ? buildScatterData(experiments, xProperty, yProperty) : undefined
  const matching = new Set(matchingIds)
  const matchingPoints = data?.points.filter((point) => matching.has(point.id)) ?? []

  return (
    <section id="charts" className="scatter-view" aria-label="Scatterplot">
      <div className="chart-view-mode" role="group" aria-label="Scatterplot dimensions">
        <span>Scatterplot</span>
        <button className={`button${mode === '2d' ? ' active' : ''}`} aria-pressed={mode === '2d'} onClick={() => onModeChange('2d')}>2D</button>
        <button className={`button${mode === '3d' ? ' active' : ''}`} aria-pressed={mode === '3d'} onClick={() => onModeChange('3d')}>3D</button>
      </div>
      <div className="chart-controls">
        <PropertySelect label="X axis" properties={properties} value={axes.x} onChange={(id) => onAxisChange('x', id)} />
        <button className="button chart-swap" disabled={!xProperty || !yProperty} onClick={onSwapAxes}>
          <Icon name="swap" />Swap axes
        </button>
        <PropertySelect label="Y axis" properties={properties} value={axes.y} onChange={(id) => onAxisChange('y', id)} />
        {mode === '3d' && <PropertySelect label="Z axis" properties={properties} value={zPropertyId} onChange={onZChange} />}
      </div>

      {!xProperty || !yProperty || (mode === '3d' && !zProperty) ? (
        <div className="empty-state"><h3>No properties to plot</h3><p>The dataset needs numeric input or output properties to create a chart.</p></div>
      ) : !data?.points.length ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="chart" /></span>
          <h3>{experiments.length ? mode === '3d' ? 'No complete triples to plot' : 'No complete pairs to plot' : isFiltered ? 'No matching experiments' : 'No experiments available'}</h3>
          <p>{experiments.length
            ? 'Choose different axes. These experiments are missing a value for at least one selected property.'
            : isFiltered ? 'Adjust your search or filters to see experiments in the chart.' : 'The dataset does not contain any experiments yet.'}</p>
          {isFiltered && <button className="button" onClick={onResetQuery}>Reset search and filters</button>}
        </div>
      ) : (
        <>
          <div className="chart-summary" role="status">
            <p><strong>{hasPlotFilter ? `${matchingPoints.length} matching · ${data.points.length} shown for context` : `${data.points.length} plotted`}</strong>{data.omittedCount > 0 && ` · ${data.omittedCount} omitted: missing an axis value`}</p>
            <span className="chart-legend"><span className="chart-legend-dot" />Experiment<span className="chart-legend-dot selected" />Selected</span>
          </div>
          <div className="chart-surface">
            {mode === '3d' && data3D && zProperty ? (
              <ScatterPlot3D key={`${xProperty.id}/${yProperty.id}/${zProperty.id}`} points={data3D.points} xLabel={xProperty.name} yLabel={yProperty.name} zLabel={zProperty.name}
                highlightedIds={selectedIds} matchingIds={matchingIds} camera={camera} onCameraChange={onCameraChange} formatValue={formatValue} onPointActivate={onOpen} />
            ) : <ScatterPlot key={`${xProperty.id}/${yProperty.id}`} points={data.points} xLabel={xProperty.name} yLabel={yProperty.name}
              highlightedIds={selectedIds} matchingIds={matchingIds} rangeSelection={rangeSelection}
              onRangeSelect={(range) => onPlotFilter({ xPropertyId: xProperty.id, yPropertyId: yProperty.id, range })}
              formatValue={formatValue} onPointActivate={onOpen} />}
          </div>
          <p className="chart-help">{mode === '3d'
            ? 'Drag to rotate. Use the sliders to rotate, tilt, or zoom, and Reset view to restore the camera. Hover or focus for all three values; click or press Enter to open details. Existing plot ranges still apply; switch to 2D to draw a new range.'
            : 'In inspect mode, hover or focus for values; click or press Enter to open details. Plot ranges also filter the experiment table. Faded, hollow points remain as context. Drawing a new range replaces the previous plot range.'}</p>
          <ChartDataTable points={matchingPoints} xLabel={xProperty.name} yLabel={yProperty.name} zLabel={mode === '3d' ? zProperty?.name : undefined} itemLabel="Experiment" formatValue={formatValue} onPointActivate={onOpen} />
        </>
      )}
    </section>
  )
}
