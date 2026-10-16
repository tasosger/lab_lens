type IconName = 'search' | 'filter' | 'columns' | 'close' | 'arrow' | 'flask' | 'check' | 'chevron' | 'table' | 'chart' | 'swap' | 'dashboard'

const paths: Record<IconName, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  search: 'm21 21-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  filter: 'M4 6h16M7 12h10M10 18h4',
  columns: 'M3 4h18v16H3zM9 4v16M15 4v16',
  table: 'M4 4h16v16H4zM4 9h16M9 9v11',
  chart: 'M4 3v17h17M8 14h.01M11 9h.01M15 12h.01M18 5h.01M20 9h.01',
  swap: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M12 4v16m-6-6 6 6 6-6',
  flask: 'M9 3h6M10 3v7L4 20a1 1 0 0 0 1 1h14a1 1 0 0 0 1 1-1l-6-10V3M7 16h10',
  check: 'm5 12 4 4L19 6',
  chevron: 'm9 5 7 7-7 7',
}

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
