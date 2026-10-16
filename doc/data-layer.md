# Data layer

[Project overview](../README.md) · [Charts](charts.md) · [Dashboards](dashboards.md)

The data layer provides synchronous, read-only access to [experiments.json](../src/data/experiments.json). `getExperimentRepository()` validates the source on first use, copies it into an immutable snapshot, and caches the repository.

## Model and public API

The source JSON maps experiment IDs to `{ inputs, outputs }`. Repository records expose `{ id, inputs, outputs }`, with numeric property values. A missing measurement is `undefined`; zero remains a recorded value.

Property IDs include their group, such as `inputs:Polymer 1`. Properties are discovered across all records and returned outputs first, alphabetized within each group. Inputs are ingredients except `Oven Temperature`, which is a process setting.

Import the API and types from [src/data/index.ts](../src/data/index.ts).

| Method | Contract |
| --- | --- |
| `list(query?)` | Returns `{ items, total, matched }`. Defaults to every experiment ordered by ID ascending. |
| `getById(id)` | Returns the exact record or `undefined`, independently of list filters. |
| `getProperties()` | Returns property IDs, names, groups, and categories. |
| `getStatistics()` | Returns cached full-dataset averages and recorded-value counts per property. |

Averages include zeros, exclude missing values, and remain fixed under filtering. No recorded values means an `undefined` average and count zero.

## Query example

From a module directly inside `src/`:

```ts
import { getExperimentRepository } from './data/index.ts'

const repository = getExperimentRepository()
const result = repository.list({
  search: 'EXP',
  filters: [
    { propertyId: 'inputs:Polymer 1', operator: 'neq', value: 0 },
    {
      operator: 'or',
      filters: [
        {
          propertyId: 'outputs:Tensile Strength',
          operator: 'gte',
          scale: 'percentile',
          value: 75,
        },
        { propertyId: 'outputs:Cure Time', operator: 'lt', value: 3 },
      ],
    },
  ],
  sort: { field: 'outputs:Tensile Strength', direction: 'desc' },
})
```

This requires an ID matching `EXP`, nonzero Polymer 1, and either strength at or above P75 or cure time below 3. `result.total` counts the entire dataset; `result.matched` counts the returned records.

## Query rules

| Concern | Behavior |
| --- | --- |
| Search | Trims whitespace and matches ID substrings without case sensitivity. |
| Scalar conditions | `eq`, `neq`, `gt`, `gte`, `lt`, and `lte` use `value`. |
| Ranges | `between` uses `min` and `max`, including both bounds. |
| Groups | Top-level filters combine with AND. Nested `{ operator: 'and' \| 'or', filters: [...] }` groups preserve parentheses. Search must also match. |
| Empty filters | An empty top-level array is unrestricted; explicit logical groups must be nonempty. The editor omits empty draft groups before querying. |
| Missing values | Never satisfy numeric conditions, including `neq`. |
| Sorting | Accepts `id` or a property ID and `asc`/`desc`. Missing values stay last; numeric ties use ID ascending. |

Omitting `scale` means `absolute`. With `scale: 'percentile'`, thresholds must be within 0–100 and resolve by linear interpolation over the full property's distribution. Zeros are included and missing values excluded. Search and other conditions do not change that distribution.

Percentile equality uses the interpolated value: P50 of `[0, 10]` is `5`, so equality matches neither record. Ties can also prevent an exact selected percentage.

The UI previews the complete pending query without changing applied filters. Switching Absolute/Percentile preserves typed numbers. Invalid percentiles block submission; out-of-range absolute thresholds produce a warning.

## Comparisons and validation

`compareExperiments(experiments, properties, baselineId?)` returns immutable rows with source values, a `differs` flag, and signed deltas (`value − baseline`). It preserves experiment/property order and falls back to the first experiment when the baseline is unavailable. Resolve selections with `getById` so hidden rows remain comparable.

Comparisons use source precision. Zero differs from missing; all-missing rows are equal. Missing operands or subtraction overflow yield an `undefined` delta. An empty selection returns no rows and a `null` baseline.

- `DatasetValidationError` identifies malformed source data and includes the failing field's `path`.
- `QueryValidationError` covers unknown properties, nonfinite values, invalid ranges/operators, cycles, and excessive nesting (limit: 100 levels). All branches are validated before matching.

`createExperimentRepository(data)` creates an independent repository for another source or tests. `getPropertyValue(experiment, property)` reads a measurement without confusing zero with missing.

To update data, edit the bundled JSON and reload locally, or rebuild for production. The API does not write experiment records. Run `npm test` from the repository root; query, percentile, validation, comparison, and workspace tests cover these contracts.
