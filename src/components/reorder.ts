/** Move an item to the target's position, preserving the relative order of the others. */
export function reorderById<T extends { readonly id: string }>(items: readonly T[], id: string, targetId: string): readonly T[] {
  const from = items.findIndex(item => item.id === id)
  const to = items.findIndex(item => item.id === targetId)
  if (from < 0 || to < 0 || from === to) return items
  const result = [...items]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item!)
  return result
}
