import type { PropertyDefinition, PropertyId } from '../data/types.ts'
import type { ChartConfiguration, ChartSettingsByType, ChartType } from './types.ts'
import { defaultChartAxes } from './scatter.ts'
import { chartRecord, ChartValidationError, type ChartReader } from './validationContext.ts'

interface ChartDefinition<Settings> {
  label: string
  hint: string
  zeroInputPolicy: 'chart' | 'pair'
  propertyIds: (configuration: ChartConfiguration) => readonly (PropertyId | null)[]
  defaults: (properties: readonly PropertyDefinition[]) => Settings
  decode: (source: Record<string, unknown>, defaults: ChartConfiguration, reader: ChartReader) => Settings
}

/** Pure chart catalog: presentation metadata, data dependencies, defaults, and persisted settings. */
export const chartDefinitions = {
  scatterplot: {
    label: 'Scatterplot', hint: 'Each point is one experiment', zeroInputPolicy: 'chart',
    propertyIds: config => [config.chartAxes.x, config.chartAxes.y],
    defaults: properties => ({ chartAxes: defaultChartAxes(properties) }),
    decode: (source, _defaults, reader) => {
      const axes = chartRecord(source.chartAxes)
      return { chartAxes: { x: reader.optionalProperty(axes.x), y: reader.optionalProperty(axes.y) } }
    },
  },
  histogram: {
    label: 'Histogram', hint: 'Each bar counts experiments in a value range', zeroInputPolicy: 'chart',
    propertyIds: config => [config.histogramProperty],
    defaults: properties => ({ histogramProperty: defaultChartAxes(properties).y, histogramBins: 'auto' }),
    decode: (source, defaults, reader) => ({
      histogramProperty: reader.optionalProperty(source.histogramProperty === undefined ? chartRecord(source.chartAxes).y : source.histogramProperty),
      histogramBins: reader.bins(source.histogramBins === undefined ? defaults.histogramBins : source.histogramBins, 'histogram'),
    }),
  },
  pie: {
    label: 'Pie chart', hint: 'Each slice shows a share of matching experiments', zeroInputPolicy: 'chart',
    propertyIds: config => [config.pieProperty],
    defaults: properties => ({ pieProperty: defaultChartAxes(properties).x, pieGrouping: 'ranges', pieBins: 5 }),
    decode: (source, defaults, reader) => {
      const pieGrouping = source.pieGrouping === undefined ? defaults.pieGrouping : source.pieGrouping
      if (pieGrouping !== 'ranges' && pieGrouping !== 'values') throw new ChartValidationError('Invalid pie grouping.')
      return {
        pieProperty: reader.optionalProperty(source.pieProperty === undefined ? defaults.pieProperty : source.pieProperty),
        pieGrouping, pieBins: reader.bins(source.pieBins === undefined ? defaults.pieBins : source.pieBins, 'pie'),
      }
    },
  },
  heatmap: {
    label: 'Correlation heatmap', hint: 'Compare property correlations across matching experiments', zeroInputPolicy: 'pair',
    propertyIds: config => [...config.heatmapX, ...config.heatmapY],
    defaults: properties => {
      const inputs = properties.filter(property => property.group === 'inputs').map(property => property.id)
      const outputs = properties.filter(property => property.group === 'outputs').map(property => property.id)
      return { heatmapX: outputs.length ? outputs : inputs.slice(0, 1), heatmapY: inputs.length ? inputs : outputs }
    },
    decode: (source, defaults, reader) => ({
      heatmapX: reader.properties(source.heatmapX, defaults.heatmapX),
      heatmapY: reader.properties(source.heatmapY, defaults.heatmapY),
    }),
  },
  parallel: {
    label: 'Parallel coordinates', hint: 'Follow each experiment across its input and output values', zeroInputPolicy: 'chart',
    propertyIds: config => config.parallelProperties,
    defaults: properties => {
      const axes = defaultChartAxes(properties)
      const extra = (group: 'inputs' | 'outputs', except: PropertyId | null) => properties.find(property => property.group === group && property.id !== except)?.id
      return { parallelProperties: [...new Set([axes.x, axes.y, extra('inputs', axes.x), extra('outputs', axes.y)]
        .filter((id): id is PropertyId => id !== null && id !== undefined))] }
    },
    decode: (source, defaults, reader) => ({ parallelProperties: reader.properties(source.parallelProperties, defaults.parallelProperties) }),
  },
} satisfies { [Type in ChartType]: ChartDefinition<ChartSettingsByType[Type]> }

export const chartTypes: readonly ChartType[] = Object.freeze(Object.keys(chartDefinitions) as ChartType[])

export function isChartType(value: unknown): value is ChartType {
  return typeof value === 'string' && Object.hasOwn(chartDefinitions, value)
}
