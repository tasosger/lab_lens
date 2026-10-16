import { getPropertyValue } from '../../data/properties.ts'
import type { Experiment, PropertyDefinition, PropertyId } from '../../data/types.ts'
import type { ScatterPoint } from '../../charts/types.ts'
import type { ScatterPoint3D } from '../../charts/projection3D.ts'

export function defaultChartZ(properties: readonly PropertyDefinition[]): PropertyId | null {
  const axes = defaultChartAxes(properties)
  return (properties.find((property) => property.id === 'outputs:Elongation')
    ?? properties.find((property) => property.id !== axes.x && property.id !== axes.y)
    ?? properties[0])?.id ?? null
}

export function buildScatter3DData(experiments: readonly Experiment[], x: PropertyDefinition, y: PropertyDefinition, z: PropertyDefinition) {
  const byId = new Map(experiments.map((experiment) => [experiment.id, experiment]))
  const points: ScatterPoint3D[] = []
  for (const point of buildScatterData(experiments, x, y).points) {
    const value = getPropertyValue(byId.get(point.id)!, z)
    if (value !== undefined && Number.isFinite(value)) points.push({ ...point, z: value })
  }
  return { points, omittedCount: experiments.length - points.length }
}

export interface ChartAxes {
  readonly x: PropertyId | null
  readonly y: PropertyId | null
}

export function defaultChartAxes(properties: readonly PropertyDefinition[]): ChartAxes {
  const x = properties.find((property) => property.id === 'inputs:Oven Temperature')
    ?? properties.find((property) => property.group === 'inputs')
    ?? properties[0]
  const y = properties.find((property) => property.id === 'outputs:Tensile Strength')
    ?? properties.find((property) => property.group === 'outputs' && property.id !== x?.id)
    ?? properties.find((property) => property.id !== x?.id)
    ?? x
  return { x: x?.id ?? null, y: y?.id ?? null }
}

/** Adapt experiment records into chart coordinates; never turn missing values into zero. */
export function buildScatterData(experiments: readonly Experiment[], xProperty: PropertyDefinition, yProperty: PropertyDefinition) {
  const points: ScatterPoint[] = []
  for (const experiment of experiments) {
    const x = getPropertyValue(experiment, xProperty)
    const y = getPropertyValue(experiment, yProperty)
    if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) continue
    points.push({ id: experiment.id, label: experiment.id, x, y })
  }
  return { points, omittedCount: experiments.length - points.length }
}
