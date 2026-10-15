import type { Experiment, PropertyGroup } from './types.ts'

export class DatasetValidationError extends Error {
  readonly path: string

  constructor(path: string, reason: string) {
    super(`Invalid experiment dataset at ${path}: ${reason}`)
    this.name = 'DatasetValidationError'
    this.path = path
  }
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DatasetValidationError(path, 'expected an object')
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new DatasetValidationError(path, 'expected a plain object')
  }

  return value as Record<string, unknown>
}

function readValues(record: Record<string, unknown>, group: PropertyGroup, path: string) {
  const values = requireObject(record[group], `${path}.${group}`)
  const entries = Object.entries(values).map(([name, value]) => {
    const valuePath = `${path}.${group}[${JSON.stringify(name)}]`
    if (name.trim().length === 0) {
      throw new DatasetValidationError(valuePath, 'property names must not be blank')
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new DatasetValidationError(valuePath, 'expected a finite number')
    }
    return [name, value] as const
  })

  return Object.freeze(Object.fromEntries(entries))
}

/** Validate once and take an immutable snapshot without changing the input. */
export function parseExperiments(data: unknown): readonly Experiment[] {
  const dictionary = requireObject(data, '$')
  const experiments = Object.entries(dictionary).map(([id, value]) => {
    const path = `$[${JSON.stringify(id)}]`
    if (id.trim().length === 0) {
      throw new DatasetValidationError(path, 'experiment IDs must not be blank')
    }

    const record = requireObject(value, path)
    return Object.freeze({
      id,
      inputs: readValues(record, 'inputs', path),
      outputs: readValues(record, 'outputs', path),
    })
  })

  return Object.freeze(experiments)
}
