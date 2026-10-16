# LabLens

Explore how experimental inputs relate to measured outputs. LabLens brings an experiment table, flexible filters, comparisons, and interactive charts into one workspace.

Built with **React, TypeScript, and Vite**, using the supplied JSON dataset through a validated, read-only data layer. The app runs entirely in the browser; no backend or environment variables are required.

## Run locally

Use **Node.js 24.12 or newer within the 24.x release line**.

```sh
git clone https://github.com/tasosger/lab_lens.git
cd lab_lens
npm ci
npm run dev
```

Open the local URL printed by Vite. For an existing checkout, run the npm commands from the folder containing `package.json`.

## Explore and filter

In **Explore**, search experiment IDs, sort measurements, and choose visible columns. Open an experiment to inspect its inputs, outputs, and full-dataset reference averages. Select experiments with the row checkboxes; selections remain available when filters hide their rows.

To add a filter:

1. Open the **Filters** icon (then **+ Add filter** if you already have filters). Search for and choose an input or output.
2. Choose a condition and enter a value or range. Use **Absolute / Percentile** to choose the units.
3. Check the preview count, which includes the pending condition, existing filters, and experiment search.
4. Select **Add filter**. Click an applied condition to edit it in place, then **Save changes** or **Cancel**.

Use **Match all (AND)** or **Match any (OR)** to combine conditions. **Advanced → Add condition group** supports nested combinations. For example:

```text
Polymer 1 ≠ 0 AND (Tensile Strength ≥ 14 OR Cure Time < 3)
```

Add the Polymer condition first, then create a group containing the two output conditions. Set the outer group to **Match all** and the inner group to **Match any**.

Percentiles use the full dataset, including zeros and excluding missing measurements. Their cutoffs stay fixed when other filters or search change. Tied values mean a percentile filter may not select an exact percentage of experiments. The editor shows the corresponding numeric cutoff.

## Compare experiments

Select **2–100 experiments**, then choose **Compare selected**. All inputs and outputs appear side by side.

- Choose a baseline to see signed differences: `experiment value − baseline value`.
- Use **Show differences only** to focus on properties that vary.
- Green indicates an increase and red a decrease; neither implies better performance.
- Displayed values and deltas are rounded for readability. Calculations use the original values.
- **Edit selection** returns to Explore with your search, filters, columns, and selections intact.

## Visualize relationships

**Charts** shares Explore's search and filters. Choose a chart type and the properties to include:

| Chart | Use it to |
| --- | --- |
| **Scatterplot** | Inspect the relationship between two properties, swap X/Y, and open individual experiments. |
| **Histogram** | See a property's distribution with automatic bins or a count from 1 to 50. |
| **Pie chart** | Compare experiment counts and shares grouped by exact values or equal-width ranges. |
| **Correlation heatmap** | Compare Pearson correlations across independently selected row and column properties. Select a cell to open its scatterplot. |
| **Parallel coordinates** | Follow experiments across multiple properties, with independently scaled, reorderable axes. |

Plots support experiment inspection and accessible data tables. Heatmaps show paired sample counts; constant properties or fewer than three pairs produce **N/A**. Correlation describes linear association, not causation.

**Exclude zero inputs** removes experiments where a selected ingredient has an amount of zero. It applies to the chart's chosen inputs and recalculates bins and percentages. Heatmaps apply it separately to each property pair. Zero outputs and process settings remain valid.

Missing measurements are omitted where a chart requires them and reported separately. Pie slices represent experiment counts, not summed ingredient amounts.

## Save dashboards

Use **Dashboards → + Add** to create a dashboard. Add plots, edit their chart settings, choose a layout template, and drag or resize plots. **Save dashboard** stores the layout and each plot's settings in this browser's `localStorage`.

Dashboard plots use the full dataset and their own optional **Exclude zero inputs** setting. Explore's search and filters apply to the Explore and Charts views.

Saved dashboards survive refreshes in the same browser and site. Workspace search, filters, and experiment selection reset on refresh. Navigation prompts you to save, leave without saving, or keep editing a dashboard.

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with live updates. |
| `npm run check` | Run lint, all tests, and a production build. |
| `npm test` | Type-check tests and run the complete test suite. |
| `npm run test:ui` | Run mounted React interaction tests. |
| `npm run test:watch` | Rerun tests as files change; use `npm test` for type checking. |
| `npm run lint` | Run Oxlint. |
| `npm run build` | Type-check the app and build into `dist/`. |
| `npm run preview` | Serve the production build locally after building it. |

[GitHub Actions](.github/workflows/ci.yml) runs `npm ci` and `npm run check` on pushes and pull requests.

Tests cover dataset validation, numeric and percentile queries, nested AND/OR groups, comparisons, chart calculations, dashboard persistence, and UI interactions. Mounted tests use React and jsdom with controlled layout APIs; browser checks remain necessary for visual layout.

## Architecture and data

The bundled dataset contains **25 experiments, 19 inputs, and 5 outputs**. Property IDs include their group, such as `inputs:Polymer 1` or `outputs:Tensile Strength`.

| Location | Responsibility |
| --- | --- |
| [src/data/](src/data/) | JSON storage, validation, immutable repository, queries, statistics, and comparison calculations. |
| [src/features/experiments/](src/features/experiments/) | Table, filter editor, details, comparison view, and workspace state. |
| [src/chart-model/](src/chart-model/) | Shared chart types, configuration, defaults, and validation. |
| [src/charts/](src/charts/) | Reusable SVG charts, scales, calculations, and data tables. |
| [src/features/charts/](src/features/charts/) | Experiment adapters, chart controls, and view integration. |
| [src/dashboards/](src/dashboards/) | Dashboard models, layout, validation, and browser storage. |
| [src/features/dashboards/](src/features/dashboards/) | Dashboard editor, navigation, and drag/resize interactions. |
| [tests/](tests/) | Unit, integration, architecture, and UI tests. |

The data API is an in-process TypeScript module. Its repository exposes `list(query?)`, `getById(id)`, `getProperties()`, and `getStatistics()`. It validates the JSON on first use and reuses an immutable snapshot. Zero and missing values remain distinct; reference averages include zeros and stay independent of filters.

To change the dataset, edit [src/data/experiments.json](src/data/experiments.json) and reload locally, or rebuild for production. The application does not persist edits to experiment records.

Implementation guides:

- [Data layer](doc/data-layer.md): API examples, filtering semantics, validation, and comparison behavior.
- [Charts](doc/charts.md): chart calculations, accessibility, zero-input handling, and extension points.
- [Dashboards](doc/dashboards.md): storage, configuration, layout, and editing state.
