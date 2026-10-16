import type { Experiment, PropertyDefinition } from '../../data'
import type { ChartAction, ChartConfiguration } from '../../chart-model/configuration.ts'

export interface ChartViewProps {
  id: string
  showControls: boolean
  configuration: ChartConfiguration
  onChartAction: (action: ChartAction) => void
  experiments: readonly Experiment[]
  matchingIds: readonly string[]
  selectedIds: readonly string[]
  properties: readonly PropertyDefinition[]
  isFiltered: boolean
  onOpen: (id: string) => void
  onResetQuery: () => void
}
