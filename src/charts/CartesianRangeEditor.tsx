import { useId, useState, type FormEvent } from 'react'
import { parseRangeInput, rangeToInput, type RangeInput } from './rangeInput'
import type { CartesianRange } from './types'

interface CartesianRangeEditorProps {
  value: CartesianRange
  xLabel: string
  yLabel: string
  onApply: (range: CartesianRange) => void
}

export function CartesianRangeEditor(props: CartesianRangeEditorProps) {
  // A committed selection or changed axes resets the editable draft.
  return <RangeForm key={JSON.stringify([props.value, props.xLabel, props.yLabel])} {...props} />
}

function RangeForm({ value, xLabel, yLabel, onApply }: CartesianRangeEditorProps) {
  const [input, setInput] = useState(() => rangeToInput(value))
  const [error, setError] = useState(false)
  const id = useId()
  function submit(event: FormEvent) {
    event.preventDefault()
    const range = parseRangeInput(input)
    setError(!range)
    if (range) onApply(range)
  }
  const fields: { key: keyof RangeInput; label: string }[] = [
    { key: 'xMin', label: `X · ${xLabel} minimum` }, { key: 'xMax', label: `X · ${xLabel} maximum` },
    { key: 'yMin', label: `Y · ${yLabel} minimum` }, { key: 'yMax', label: `Y · ${yLabel} maximum` },
  ]
  return (
    <form className="chart-range-form" onSubmit={submit} noValidate>
      <div className="chart-range-fields">
        {fields.map(({ key, label }) => (
          <label key={key}>{label}
            <input type="number" step="any" value={input[key]} aria-invalid={error} aria-describedby={error ? id : undefined}
              onChange={(event) => { setInput({ ...input, [key]: event.target.value }); setError(false) }} />
          </label>
        ))}
      </div>
      {error && <p id={id} className="field-error" role="alert">Enter finite numbers with each minimum less than or equal to its maximum.</p>}
      <button className="button primary" type="submit">Apply plot range</button>
    </form>
  )
}
