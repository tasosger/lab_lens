import type { PropertyDefinition, PropertyId } from '../data/types.ts'
import type { ChartAxes, ChartSettingsByType, ChartType } from './types.ts'

/** Preferred input/output pair shared by chart defaults, with dataset-safe fallbacks. */
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

/** Every chart's initial settings live here; the registry composes them with its readers. */
export const chartDefaults = {
  scatterplot: properties => ({ chartAxes: defaultChartAxes(properties) }),
  histogram: properties => ({ histogramProperty: defaultChartAxes(properties).y, histogramBins: 'auto' }),
  pie: properties => ({ pieProperty: defaultChartAxes(properties).x, pieGrouping: 'ranges', pieBins: 5 }),
  heatmap: properties => {
    const inputs = properties.filter(property => property.group === 'inputs').map(property => property.id)
    const outputs = properties.filter(property => property.group === 'outputs').map(property => property.id)
    return { heatmapX: outputs.length ? outputs : inputs.slice(0, 1), heatmapY: inputs.length ? inputs : outputs }
  },
  parallel: properties => {
    const axes = defaultChartAxes(properties)
    const extra = (group: 'inputs' | 'outputs', except: PropertyId | null) => properties.find(property => property.group === group && property.id !== except)?.id
    return { parallelProperties: [...new Set([axes.x, axes.y, extra('inputs', axes.x), extra('outputs', axes.y)]
      .filter((id): id is PropertyId => id !== null && id !== undefined))] }
  },
} satisfies { [Type in ChartType]: (properties: readonly PropertyDefinition[]) => ChartSettingsByType[Type] }
