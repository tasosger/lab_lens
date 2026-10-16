import { memo, useMemo } from 'react'
import { chartDefinitions } from '../../chart-model/registry'
import type { ChartViewProps } from './ChartViewProps'
import { chartRenderers } from './chartRenderers'
import { chartIngredientInputs, excludeChartZeroInputs } from './inputPresence'
import './inputPresence.css'

/** One chart dispatcher for the Charts page and saved dashboard widgets. */
export const ExperimentChartView = memo(function ExperimentChartView({ id = 'charts', showControls = true, configuration, onChartAction, experiments, matchingIds,
  selectedIds, properties, isFiltered, onOpen, onResetQuery }: Omit<ChartViewProps, 'id' | 'showControls'> & Partial<Pick<ChartViewProps, 'id' | 'showControls'>>) {
  const filteredExperiments = useMemo(() => excludeChartZeroInputs(experiments, configuration, properties), [experiments, configuration, properties])
  const activeInputs = chartIngredientInputs(configuration, properties)
  const matching = new Set(matchingIds)
  const excludedCount = experiments.filter(experiment => matching.has(experiment.id)).length
    - filteredExperiments.filter(experiment => matching.has(experiment.id)).length
  const reset = () => { onChartAction({ type: 'hide-zero-inputs', value: false }); onResetQuery() }
  const common = { id, showControls, experiments: filteredExperiments, matchingIds, selectedIds, properties,
    isFiltered: isFiltered || (configuration.hideZeroInputs && activeInputs.length > 0), onOpen, onResetQuery: reset }
  const Chart = chartRenderers[configuration.chartType]
  const perPair = chartDefinitions[configuration.chartType].zeroInputPolicy === 'pair'
  return <>
    {activeInputs.length > 0 && <div className="chart-zero-filter">
      <label className="zero-input-toggle" title={perPair
        ? 'Exclude zero ingredient amounts separately for each cell’s property pair.'
        : `Exclude experiments with a zero amount for: ${activeInputs.map(property => property.name).join(', ')}.`}>
        <input type="checkbox" checked={configuration.hideZeroInputs}
          onChange={event => onChartAction({ type: 'hide-zero-inputs', value: event.target.checked })} />
        Exclude zero inputs
      </label>
      {configuration.hideZeroInputs && <span role="status">{perPair ? 'Per cell' : `${excludedCount} excluded`}</span>}
    </div>}
    <Chart {...common} configuration={configuration} onChartAction={onChartAction} />
  </>
})
