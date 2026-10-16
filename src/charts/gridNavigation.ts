export interface GridCell { row: number; column: number }

/** Roving focus: Tab exits the matrix; arrows and Home/End navigate its cells. */
export function nextGridCell(cell: GridCell, key: string, rows: number, columns: number, control = false): GridCell | null {
  if (rows < 1 || columns < 1) return null
  let { row, column } = cell
  switch (key) {
    case 'ArrowLeft': column--; break
    case 'ArrowRight': column++; break
    case 'ArrowUp': row--; break
    case 'ArrowDown': row++; break
    case 'Home': column = 0; if (control) row = 0; break
    case 'End': column = columns - 1; if (control) row = rows - 1; break
    default: return null
  }
  return { row: Math.max(0, Math.min(rows - 1, row)), column: Math.max(0, Math.min(columns - 1, column)) }
}
