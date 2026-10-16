import { pearsonCorrelation, type CorrelationRow } from '../../charts/correlation.ts'
import { getPropertyValue } from '../../data/properties.ts'
import { isAbsentInput } from '../../data/inputPresence.ts'
import type { Experiment, PropertyDefinition, PropertyId } from '../../data/types.ts'
import { propertyDimension } from './experimentData.ts'

export function buildCorrelationMatrix(experiments: readonly Experiment[], columns: readonly PropertyDefinition[], rows: readonly PropertyDefinition[], hideZeroInputs = false): CorrelationRow<PropertyId>[] {
  const xDimensions = columns.map(propertyDimension)
  return rows.map(y => {
    const yDimension = propertyDimension(y)
    return { property: yDimension, cells: columns.map((x, index) => ({ x: xDimensions[index]!, y: yDimension,
      ...pearsonCorrelation(experiments.map(experiment => [
        hideZeroInputs && isAbsentInput(experiment, x) ? undefined : getPropertyValue(experiment, x),
        hideZeroInputs && isAbsentInput(experiment, y) ? undefined : getPropertyValue(experiment, y),
      ] as const)),
    })) }
  })
}
