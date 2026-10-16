import { createContext, useContext, useEffect, useRef, useState } from 'react'

export const ChartHeightContext = createContext<number | undefined>(undefined)

export function useChartSize() {
  const preferredHeight = useContext(ChartHeightContext)
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const updateWidth = (measured: number) => {
      if (measured > 0) setWidth(Math.max(1, Math.round(measured)))
    }
    updateWidth(element.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { container, width, preferredHeight, height: preferredHeight ?? Math.min(440, Math.max(300, Math.round(width * 0.55))) }
}
