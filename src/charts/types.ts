export type NumericDomain = readonly [number, number]
export interface NumericScale {
  (value: number): number
  invert: (position: number) => number
}

export interface ChartPosition {
  readonly x: number
  readonly y: number
}

export interface ChartAxisDefinition {
  readonly label: string
  readonly domain: NumericDomain
  readonly ticks?: readonly number[]
}

export interface ScatterPoint {
  readonly id: string
  readonly label: string
  readonly x: number
  readonly y: number
}

export interface NumericDatum {
  readonly id: string
  readonly label: string
  readonly value: number
}

export interface ChartDimension<Id extends string = string> {
  readonly id: Id
  readonly label: string
  readonly groupLabel: string
}

export interface ParallelDimension extends ChartDimension {
  readonly domain: NumericDomain
}

export interface ParallelLine {
  readonly id: string
  readonly label: string
  readonly values: readonly number[]
}

export interface CartesianLayout {
  readonly width: number
  readonly height: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly xScale: NumericScale
  readonly yScale: NumericScale
}
