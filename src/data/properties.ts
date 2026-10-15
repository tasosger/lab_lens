import type { Experiment, PropertyDefinition, PropertyGroup } from './types.ts'

export function compareNames(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/** Discover the union of properties, with outputs first and names ordered consistently. */
export function buildProperties(experiments: readonly Experiment[]): readonly PropertyDefinition[] {
  const groups: readonly PropertyGroup[] = ['outputs', 'inputs']
  const properties = groups.flatMap((group) => {
    const names = new Set(experiments.flatMap((experiment) => Object.keys(experiment[group])))
    return [...names].sort(compareNames).map((name): PropertyDefinition => Object.freeze({
      id: `${group}:${name}`,
      group,
      name,
      category: group === 'outputs'
        ? 'measurement'
        : name === 'Oven Temperature' ? 'process' : 'ingredient',
    }))
  })
  return Object.freeze(properties)
}

export function getPropertyValue(
  experiment: Experiment,
  property: PropertyDefinition,
): number | undefined {
  const values = experiment[property.group]
  return Object.hasOwn(values, property.name) ? values[property.name] : undefined
}
