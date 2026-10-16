import { getPropertyValue } from '../../data/properties.ts'
import type { Experiment, PropertyDefinition } from '../../data/types.ts'
import type { ScatterPoint } from '../../charts/types.ts'
import type { ScatterPoint3D } from '../../charts/projection3D.ts'

export function buildScatter3DData(experiments: readonly Experiment[], x: PropertyDefinition, y: PropertyDefinition, z: PropertyDefinition) {
  const byId = new Map(experiments.map((experiment) => [experiment.id, experiment]))
  const points: ScatterPoint3D[] = []
  for (const point of buildScatterData(experiments, x, y).points) {
    const value = getPropertyValue(byId.get(point.id)!, z)
    if (value !== undefined && Number.isFinite(value)) points.push({ ...point, z: value })
  }
  return { points, omittedCount: experiments.length - points.length }
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
