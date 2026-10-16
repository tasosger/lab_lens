import { memo, useCallback, useMemo } from 'react'
import { ChartHeightContext } from '../../charts/useChartSize'
import type { ChartAction, ChartConfiguration } from '../../chart-model/types'
import type { ExperimentRepository } from '../../data'
import { ExperimentChartView } from '../charts/ExperimentChartView'
import type { DashboardAction } from './dashboardReducer'

const noQueryToReset = () => {}

/** Layout previews and title edits do not invalidate chart data or rebuild plotted marks. */
export const DashboardChart = memo(function DashboardChart({ id, widgetId, configuration, plotHeight, editing, repository, selectedIds, onAction, onOpen }: {
  id: string
  widgetId: string
  configuration: ChartConfiguration
  plotHeight: number | undefined
  editing: boolean
  repository: ExperimentRepository
  selectedIds: readonly string[]
  onAction: (action: DashboardAction) => void
  onOpen: (id: string, hidden: boolean) => void
}) {
  const experiments = useMemo(() => repository.list().items, [repository])
  const matchingIds = useMemo(() => experiments.map(experiment => experiment.id), [experiments])
  const onChartAction = useCallback((action: ChartAction) => onAction({ type: 'chart', id: widgetId, action }), [widgetId, onAction])
  const openExperiment = useCallback((id: string) => onOpen(id, false), [onOpen])

  return <ChartHeightContext.Provider value={plotHeight}>
    <ExperimentChartView id={id} showControls={editing}
      experiments={experiments} matchingIds={matchingIds} selectedIds={selectedIds} properties={repository.getProperties()}
      configuration={configuration} onChartAction={onChartAction} isFiltered={false}
      onResetQuery={noQueryToReset} onOpen={openExperiment} />
  </ChartHeightContext.Provider>
})
