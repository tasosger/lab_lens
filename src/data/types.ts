export type PropertyGroup = 'inputs' | 'outputs'
export type PropertyId = `${PropertyGroup}:${string}`

export interface Experiment {
  readonly id: string
  readonly inputs: Readonly<Record<string, number | undefined>>
  readonly outputs: Readonly<Record<string, number | undefined>>
}

export interface PropertyDefinition {
  readonly id: PropertyId
  readonly group: PropertyGroup
  readonly name: string
  readonly category: 'ingredient' | 'process' | 'measurement'
}

export interface PropertyStatistics {
  readonly propertyId: PropertyId
  readonly average: number | undefined
  readonly count: number
}

export type NumericFilter =
  | {
      readonly propertyId: PropertyId
      readonly operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
      readonly value: number
    }
  | {
      readonly propertyId: PropertyId
      readonly operator: 'between'
      readonly min: number
      readonly max: number
    }

export interface FilterGroup {
  readonly operator: 'and' | 'or'
  readonly filters: readonly FilterExpression[]
}

export type FilterExpression = NumericFilter | FilterGroup

export interface ExperimentSort {
  readonly field: 'id' | PropertyId
  readonly direction: 'asc' | 'desc'
}

export interface ExperimentQuery {
  readonly search?: string
  readonly filters?: readonly FilterExpression[]
  readonly sort?: ExperimentSort
}

export interface ExperimentList {
  readonly items: readonly Experiment[]
  readonly total: number
  readonly matched: number
}

export interface ExperimentRepository {
  readonly list: (query?: ExperimentQuery) => ExperimentList
  readonly getById: (id: string) => Experiment | undefined
  readonly getProperties: () => readonly PropertyDefinition[]
  readonly getStatistics: () => readonly PropertyStatistics[]
}
