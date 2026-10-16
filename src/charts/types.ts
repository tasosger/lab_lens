export type NumericDomain = readonly [number, number]
export interface NumericScale {
  (value: number): number
  invert: (position: number) => number
}

export interface CartesianRange {
  readonly x: NumericDomain
  readonly y: NumericDomain
}

export interface ChartPosition {
  readonly x: number
  readonly y: number
}

export interface ChartRectangle {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
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
