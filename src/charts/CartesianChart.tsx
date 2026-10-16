import { useId, type ReactNode } from 'react'
import { ChartAxis } from './ChartAxis'
import { linearScale } from './numericScale'
import { useChartSize } from './useChartSize'
import type { CartesianLayout, ChartAxisDefinition } from './types'
import './charts.css'

interface CartesianChartProps {
  title: string
  description: string
  xAxis: ChartAxisDefinition
  yAxis: ChartAxisDefinition
  children: (layout: CartesianLayout) => ReactNode
  overlay?: (layout: CartesianLayout) => ReactNode
}

/** Shared responsive plot frame, numeric axes, grid, and HTML overlay layer. */
export function CartesianChart({ title, description, xAxis, yAxis, children, overlay }: CartesianChartProps) {
  const id = useId()
  const { container, width, height } = useChartSize()
  const left = 84
  const right = width - 30
  const top = 22
  const bottom = height - 62
  const layout: CartesianLayout = {
    width, height, left, right, top, bottom,
    xScale: linearScale(xAxis.domain, [left, right]),
    yScale: linearScale(yAxis.domain, [bottom, top]),
  }

  return (
    <div className="cartesian-chart" ref={container}>
      <svg data-chart-surface style={{ height }} viewBox={`0 0 ${width} ${height}`} role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-description`}>{description}</desc>
        <ChartAxis orientation="x" axis={xAxis} layout={layout} />
        <ChartAxis orientation="y" axis={yAxis} layout={layout} />
        {children(layout)}
      </svg>
      {overlay?.(layout)}
    </div>
  )
}
