import type { ChartType } from '../../chart-model/types.ts'
import { chartDefinitions, chartTypes, isChartType } from '../../chart-model/registry'
import '../../components/propertySelect.css'

export function ChartTypeSelect({ value, onChange }: { value: ChartType; onChange: (value: ChartType) => void }) {
  return (
    <label className="property-select chart-type-select">
      <span>Chart type</span>
      <select value={value} onChange={event => { if (isChartType(event.target.value)) onChange(event.target.value) }}>
        {chartTypes.map(type => <option key={type} value={type}>{chartDefinitions[type].label}</option>)}
      </select>
    </label>
  )
}
