import { useEffect, useRef } from 'react'

/** Edits a draft live; Enter/blur finish and Escape restores the original name. */
export function InlineNameEditor({ value, label, onChange, onFinish }: {
  value: string
  label: string
  onChange: (value: string) => void
  onFinish: (restoreFocus: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const original = useRef(value)
  const finished = useRef(false)
  useEffect(() => { input.current?.focus(); input.current?.select() }, [])

  function finish(cancel = false, restoreFocus = false) {
    if (finished.current) return
    finished.current = true
    onChange(cancel ? original.current : value.trim() || original.current)
    onFinish(restoreFocus)
  }

  return <input ref={input} className="inline-name-editor" aria-label={label} value={value}
    title="Enter to finish, Escape to cancel" onChange={event => onChange(event.target.value)} onBlur={() => finish()}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing) return
      if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); finish(event.key === 'Escape', true) }
    }} />
}
