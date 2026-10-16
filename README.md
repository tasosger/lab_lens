# LabLens

A React + TypeScript experiment explorer using Vite. The Explore page reads the supplied JSON through a validated, read-only data API.

Search experiment IDs, sort measurements, choose visible columns, and combine numeric conditions in nested filter groups. Each group has its own Match all (AND) or Match any (OR) setting, allowing both operators in one query. Filters include not equal and inclusive ranges. Open an experiment to inspect all its inputs and outputs, select 2 to 100 experiments for side-by-side comparison, or plot two properties in Charts. Selections remain available when search or filters hide their rows.

Drag the details drawer's left edge to widen or narrow it. The grip also supports left/right arrow keys, Shift for larger steps, and Home/End for minimum/maximum width. On small screens, details fill the screen. Every input and output shows its full-dataset average and an above, below, or at-average indicator. Averages include zeros, exclude missing values, and stay fixed when you filter the table.

Above-average badges use green gradients and below-average badges use red. The shade strengthens with the relative difference from the average, reaching full intensity at 100% or more. Equal and missing values stay neutral; nonzero values compared with a zero average use full intensity.

## Getting started

Use Node.js 24.12 or later within the 24.x release line. Tests run TypeScript directly with Node's built-in test runner.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Combining AND and OR in the page

For `(Tensile Strength >= 14 OR Cure Time < 3) AND Polymer 1 != 0`:

1. Open **Filters** and keep **All filters** on **all (AND)**.
2. Choose **Add group**. In that group, select **any (OR)** and add the two output conditions using its **Add condition** button.
3. Use **Add condition** under **All filters** to add `Polymer 1 != 0` outside the inner group.

Groups can contain further groups. Each group's border shows which conditions it combines, and closing the panel shows the applied expression with parentheses. Empty groups are drafts and do not affect results until they contain an applied condition. Removing a group removes its contents; clearing filters preserves search, column choices, and experiment selections.

## Comparing experiments

Select 2 to 100 experiment checkboxes, then choose **Compare selected**, or open **Compare** in the sidebar. The comparison shows all outputs followed by all inputs, regardless of which columns or filters you selected in Explore.

The first selected experiment is the initial baseline. Choose another in **Baseline experiment** to update signed differences (`experiment value - baseline value`). **Show differences only** hides identical rows. Differences use original numeric values, including zero; missing measurements display as an em dash and cannot produce a delta. Increasing and decreasing values are not quality ratings.

Remove experiments from their column headers. Removing the baseline selects the first remaining experiment as the new reference; fewer than two selections shows guidance to select another. **Edit selection** returns to Explore without clearing search, filters, visible columns, sorting, or selections. Comparison preferences also survive switching views. A page refresh resets workspace state.

## Exploring charts

Open **Charts**, choose a **Chart type**, and choose an input or output for each axis. The first plot is a 2D scatterplot showing Oven Temperature against Tensile Strength. **Swap axes** exchanges X/Y, or X/Z and Y/Z in 3D. Changing axes redraws immediately; search and nested filters are shared with the experiment table. Axis choices survive switching views.

Choose **3D scatterplot** to add a Z axis (Elongation by default). Drag to rotate and tilt, scroll over the plot to zoom, and double-click the background to reset the camera. All three values appear in point tooltips and the plotted-data table. Chart type, Z-axis choice, and camera settings survive view changes. Existing plot-range filters still apply; switch to 2D to draw another range.

Hover or focus a point to inspect its values; click or press Enter/Space to open the existing details drawer. Selected experiments have darker, outlined markers. **View plotted data** lists every point, including overlapping experiments, with buttons to open their details. Missing axis values are omitted and counted, while zeros remain valid coordinates. Empty results explain how to recover. Histograms are a later extension.

The reusable plotting components, numeric scales, axes, responsive frame, and data table live in `src/charts/`. Experiment-specific defaults and the record-to-point adapter live in `src/features/charts/`. See [chart architecture](doc/charts.md) for the extension points.

## Commands

## Saved dashboards

Open **Dashboards** in the sidebar for the default **Experiment overview**, which starts with two plots. Create a dashboard, add plots, choose their properties and 2D/3D mode, and use **Save dashboard** to keep its configuration after a refresh. Rename, duplicate, delete, reorder, and choose half/full-width plots. The dashboard list can sort by name or last saved time.

Search and nested filters apply to every plot in that dashboard. Brushing a 2D plot filters the other plots; the source plot retains context points for changing its range. Dashboard filters are independent of Explore/Charts. Unsaved drafts survive navigation within the app; the save status indicates whether changes have been written to this browser's local storage. Storage failures are shown without overwriting existing data or reporting a successful save. See [dashboard architecture](doc/dashboards.md).

## Commands

- `npm run dev`: start the development server.
- `npm run build`: type-check the project and create a production build in `dist`.
- `npm run lint`: run the linter.
- `npm test`: type-check and run the data and workspace state tests.
- `npm run test:watch`: rerun tests as files change; use `npm test` for type checking.
- `npm run preview`: preview the production build locally after building it.

## Deploying to Vercel

The app deploys as a static Vite site. Its JSON data is bundled into the browser build; no server, database service, or environment variables are required.

`vercel.json` sets the Vite preset, installs locked dependencies with `npm ci`, runs lint and tests before the production build, and publishes `dist/`. Its SPA rewrite serves `index.html` for client-side URLs. The package engine range keeps builds on Node.js 24, with a minimum of 24.12.

For automatic deployments from the existing GitHub repository:

1. Commit and push the deployment configuration and any app changes you want to publish to `tasosger/lab_lens`.
2. Sign in at [Vercel New Project](https://vercel.com/new), connect GitHub if needed, and import `tasosger/lab_lens`.
3. Use `lab-lens` as the project name, **Vite** as the framework, and **`./`** as the root directory. The repository already starts inside the app; do not enter `experiment-explorer` as a subdirectory.
4. Use Node.js **24.x** and the build/install/output settings from `vercel.json`. No environment variables need to be added.
5. Deploy and confirm the production branch is **`master`**. Later pushes to this branch update production; other branches create previews.

Alternatively, create a preview directly from this app directory:

```sh
npx vercel login
npx vercel
```

Choose your Vercel account or team and link the existing `lab-lens` project, or create it if it does not exist. Use `./` for the code directory. The default CLI deployment is a preview; `npx vercel --prod` publishes to production. For Git-based automatic deployments, connect the GitHub repository in the project's settings if it was created through the CLI.

`.vercel/` contains local project-link information and is ignored by Git. `DESIGN.md` stays locally ignored by Git and is explicitly excluded from CLI uploads in `.vercelignore`.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Git deployments](https://vercel.com/docs/git), and [supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Structure

- `doc/`: brief component documentation, starting with the [data layer](doc/data-layer.md).
- `src/App.tsx`: application entry and dataset error state.
- `src/features/experiments/`: Explore table, filters, details drawer, formatting, styles, and workspace state.
- `src/features/charts/`: experiment scatterplot view, defaults, and record-to-point adapter.
- `src/charts/`: reusable chart types, scales, axes, responsive frame, scatterplot, and accessible data table.
- `src/components/PropertySelect.tsx`: shared grouped property picker.
- `src/main.tsx`: React entry point.
- `src/index.css`: base stylesheet.
- `vite.config.ts`: Vite configuration.
- `src/data/experiments.json`: the application's JSON data store, copied unchanged from the supplied dataset.
- `src/data/index.ts`: public data API and lazily validated repository instance.
- `src/data/repository.ts`: repository factory and immutable record lookup.
- `src/data/validation.ts`: runtime dataset validation and normalization.
- `src/data/properties.ts`: property discovery, categories, and value access.
- `src/data/statistics.ts`: full-dataset reference averages and recorded-value counts.
- `src/data/comparison.ts`: differing-property detection and signed baseline differences.
- `src/data/query.ts`: search, numeric filters, and sorting.
- `src/data/types.ts`: public TypeScript contracts.
- `tests/`: TypeScript unit tests and real-dataset integration tests.

## Data API

Import the public API from `src/data/index.ts`. It runs synchronously in the browser and reads the bundled JSON. The repository validates and copies the data on first use, then reuses that immutable snapshot.

```ts
import { getExperimentRepository } from './data/index.ts'

const experiments = getExperimentRepository()

const result = experiments.list({
  search: 'EXP',
  filters: [
    { propertyId: 'outputs:Tensile Strength', operator: 'gte', value: 14 },
  ],
  sort: { field: 'outputs:Viscosity', direction: 'asc' },
})

// result.items: matching experiments in the requested order
// result.total: total experiments in storage
// result.matched: matching experiments

const experiment = experiments.getById('20170102_EXP_56')
const properties = experiments.getProperties()
```

| Method | Contract |
| --- | --- |
| `list(query?)` | Returns immutable records with total and matching counts. With no query, returns every experiment ordered by ID ascending. |
| `getById(id)` | Returns the exact experiment or `undefined` when it does not exist. Independent of previous list queries. |
| `getProperties()` | Returns the union of properties across all records, outputs first, alphabetized within each group. IDs include the group, such as `inputs:Oven Temperature`. |
| `getStatistics()` | Returns cached full-dataset averages and recorded-value counts per property, independent of queries. Missing values are excluded; zeros are included. |

Search trims surrounding whitespace and matches experiment IDs without case sensitivity. Top-level filters combine using AND, including multiple conditions on the same property. Supported numeric operators are `eq`, `neq` (not equal), `gt`, `gte`, `lt`, `lte`, and `between`. A `between` filter uses `min` and `max` instead of `value`, and includes both bounds.

Use a logical group to match any condition with OR or to nest AND/OR conditions. Each group has an `operator` of `and` or `or` and a non-empty `filters` array. Groups can contain numeric conditions or further groups. Search must still match independently of the filter expression.

```ts
// (Tensile Strength >= 14 OR Cure Time < 3) AND Polymer 1 != 0
const results = experiments.list({
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

An empty top-level `filters` array applies no numeric restrictions. Empty logical groups are invalid. Every branch is validated before matching, including branches that evaluation could otherwise skip.

Sorting accepts `id` or a property ID, with direction `asc` or `desc`. Numeric ties use ID ascending, and missing values stay last in either direction. Missing properties do not satisfy numeric filters, including `neq`; zero is a valid measurement.

`getPropertyValue(experiment, property)` returns a property's number or `undefined`. `createExperimentRepository(data)` creates an independent repository from an unknown object, which is useful for tests or a future data source.

Malformed datasets throw `DatasetValidationError` with a `path` to the invalid field. Invalid filter values, reversed ranges, unknown properties, and invalid sort directions throw `QueryValidationError`. Both error classes are exported by the public API. The UI can catch them to show an error state.

The API exposes reads only. It does not write files or persist edits. To change the stored data during development, edit `src/data/experiments.json` and reload the app; production changes require rebuilding. The original assignment JSON is left untouched, and tests run using the copy inside this project.

## Test coverage

The suite checks the real dataset's 25 experiments and 24 properties, malformed input, zero versus missing values, each numeric filter operator, nested AND/OR groups, invalid branches, combined queries, numeric sorting and ties, unknown IDs and properties, and protection against data mutation. Workspace tests exercise the same query construction used by the page, covering mixed groups and parentheses, empty drafts, group removal, independent group modes, selection retention, and column and sort resets. No extra test dependencies are required.

Dependencies and configuration follow the official [Vite React TypeScript starter](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts).
