# Data layer

The data layer gives UI components synchronous, read-only access to bundled [`experiments.json`](../src/data/experiments.json). It runs locally without a backend. On first use, `getExperimentRepository()` validates the data, copies it into an immutable snapshot, and caches the repository.

## Data model

Each experiment has an `id` and numeric `inputs`/`outputs` maps. Property IDs include their group, such as `outputs:Tensile Strength`. Missing measurements return `undefined`; zero remains a valid value.

Properties are discovered across all experiments, with outputs first and names alphabetized within each group. Outputs are categorized as measurements; inputs are ingredients except `Oven Temperature`, which is a process setting.

## Public API

Import from [`src/data/index.ts`](../src/data/index.ts).

| Method | Returns |
| --- | --- |
| `list(query?)` | `{ items, total, matched }`: matching records, full dataset count, and matching count. Defaults to all records ordered by ID ascending. |
| `getById(id)` | The exact experiment, or `undefined`. Independent of list filters. |
| `getProperties()` | Property definitions for selectors and table columns. |
| `getStatistics()` | Cached, immutable full-dataset statistics per property: `propertyId`, `average`, and recorded-value `count`. |

Reference averages include zero values and exclude missing measurements. They do not change with search or filters. A property with no recorded values has an `undefined` average and a count of zero.

Example from a module directly inside `src/`:

```ts
import { getExperimentRepository } from './data/index.ts'

const repository = getExperimentRepository()
const result = repository.list({
  search: 'EXP',
  filters: [
    { propertyId: 'outputs:Tensile Strength', operator: 'gte', value: 14 },
  ],
  sort: { field: 'outputs:Tensile Strength', direction: 'desc' },
})
```

## Query behavior

- Search trims whitespace and matches ID substrings without case sensitivity.
- Top-level filters combine with AND. Numeric operators: `eq`, `neq` (not equal), `gt`, `gte`, `lt`, `lte`, and inclusive `between` (using `min`/`max`). Missing values never match, including with `neq`.
- Logical groups use `{ operator: 'and' | 'or', filters: [...] }` and may nest. An OR group matches any child; an AND group requires every child. Search must also match.
- An empty top-level filter array means no numeric restrictions. Explicit logical groups must contain at least one condition. Every branch is validated before matching, even if another branch would decide the result.
- Sorting accepts `id` or a property ID and `asc`/`desc`. Missing values stay last; property-value ties use ID ascending.

For example, `(Tensile Strength >= 14 OR Cure Time < 3) AND Polymer 1 != 0`:

```ts
const result = repository.list({
  filters: [
    {
      operator: 'or',
      filters: [
        { propertyId: 'outputs:Tensile Strength', operator: 'gte', value: 14 },
        { propertyId: 'outputs:Cure Time', operator: 'lt', value: 3 },
      ],
    },
    { propertyId: 'inputs:Polymer 1', operator: 'neq', value: 0 },
  ],
})
```

`FilterExpression`, `FilterGroup`, and `NumericFilter` are exported from the public API for typed query construction.

## Comparing selected experiments

The public `compareExperiments(experiments, properties, baselineId?)` helper returns immutable comparison rows and the resolved baseline ID. Resolve selected records with `getById` so Explore filters do not remove them from the comparison. Record and property order are preserved. The first record is the fallback when a baseline is absent or no longer selected.

Each row contains its property definition, a `differs` flag, and values with experiment IDs and signed deltas (`value - baseline value`). Comparisons use original numeric precision. Missing and zero values are distinct; all-missing rows are equal. Deltas are `undefined` when either measurement is missing or subtraction exceeds the finite numeric range. An empty selection returns no rows and a `null` baseline.

## Validation and maintenance

Invalid datasets throw `DatasetValidationError` with the failing field's `path`. Invalid queries, including unknown properties or reversed ranges, throw `QueryValidationError`. Both are exported for UI error handling.

`createExperimentRepository(data)` builds an independent repository for tests or another data source. `getPropertyValue(experiment, property)` reads a value from a property definition.

To update data, edit the bundled JSON and reload; production requires rebuilding. Run `npm test` from `experiment-explorer/` to check validation, queries, immutability, and the real dataset.
