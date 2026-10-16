import { getPropertyValue } from './properties.ts'
import type { Experiment, PropertyDefinition } from './types.ts'

/** Zero denotes absence for ingredient amounts, not output or process measurements. */
export function isIngredientInput(property: PropertyDefinition): boolean {
  return property.group === 'inputs' && property.category === 'ingredient'
}

export function isAbsentInput(experiment: Experiment, property: PropertyDefinition): boolean {
  return isIngredientInput(property) && getPropertyValue(experiment, property) === 0
}
