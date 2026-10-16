import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { tooltipLayout } from './tooltipLayout'

export function ChartTooltip({ id, width, height, x, y, children }: {
  id: string; width: number; height: number; x: number; y: number; children: ReactNode
}) {
  const element = useRef<HTMLDivElement>(null)
  const [measuredHeight, setMeasuredHeight] = useState(0)
  useLayoutEffect(() => {
    const node = element.current
    if (!node) return
    const measure = () => setMeasuredHeight(node.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const layout = tooltipLayout(width, height, x, y, measuredHeight)
  return <div ref={element} id={id} role="tooltip" className="chart-tooltip" style={{
    width: layout.width,
    position: layout.inFlow ? 'relative' : 'absolute',
    left: layout.inFlow ? undefined : layout.left,
    top: layout.inFlow ? undefined : layout.top,
    margin: layout.inFlow ? layout.inset : undefined,
  }}>{children}</div>
}
