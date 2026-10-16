import type { PropertyDefinition, PropertyId } from '../data/types.ts'

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

export function defaultChartZ(properties: readonly PropertyDefinition[]): PropertyId | null {
  const axes = defaultChartAxes(properties)
  return (properties.find((property) => property.id === 'outputs:Elongation')
    ?? properties.find((property) => property.id !== axes.x && property.id !== axes.y)
    ?? properties[0])?.id ?? null
}
