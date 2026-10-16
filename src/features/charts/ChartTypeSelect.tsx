import type { ChartType } from './chartConfiguration'
import '../../components/propertySelect.css'

export function ChartTypeSelect({ value, onChange }: { value: ChartType; onChange: (value: ChartType) => void }) {
  return (
    <label className="property-select chart-type-select">
      <span>Chart type</span>
      <select value={value} onChange={event => onChange(event.target.value as ChartType)}>
        <option value="scatterplot">Scatterplot</option>
        <option value="histogram">Histogram</option>
        <option value="pie">Pie chart</option>
        <option value="heatmap">Correlation heatmap</option>
        <option value="parallel">Parallel coordinates</option>
      </select>
    </label>
  )
}
