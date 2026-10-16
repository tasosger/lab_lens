# Charts

[Project overview](../README.md) · [Data layer](data-layer.md) · [Dashboards](dashboards.md)

Five chart types share configuration, controls, and rendering between the Charts view and dashboard plots.

## Data and filtering

| Context | Source experiments |
| --- | --- |
| Charts view | Explore's search and nested numeric/percentile filters. |
| Dashboard plot | The full dataset, with independent chart settings. |

Both contexts support **Exclude zero inputs**. It defaults off and treats an ingredient amount of zero as absent. Only properties used by the active chart participate: the selected property for pie/histogram, X/Y for scatterplots, or the chosen parallel axes. Output zeros, process settings, and unrelated ingredients do not exclude records.

Heatmaps apply exclusion separately to each cell's property pair. Other charts exclude a record if any chosen ingredient is zero. Exclusion happens before bins, percentages, and domains are calculated; missing measurements are counted separately. This setting does not change source records, table filters, comparisons, or reference averages.

## Chart behavior

| Type | Calculation and interaction |
| --- | --- |
| Scatterplot | One point per complete X/Y pair. Domains pad observed values; overlapping points retain their original coordinates. Swap X/Y or activate a point to inspect its experiment. |
| Histogram | Equal-width bins over recorded values. **Auto** uses `ceil(sqrt(n))`, capped at 50; explicit counts accept 1–50. Dark segments show selected experiments. Activate a bin to inspect its records. |
| Pie chart | Groups exact values or equal-width ranges (default: 5 bins). Slices count experiments, with shares based on recorded values after exclusions. Activate a slice or legend entry to inspect records. |
| Correlation heatmap | Pearson's r and sample count for each independently chosen row/column pair. Constant properties or fewer than three complete pairs show **N/A**. Activate a cell to open its scatterplot. |
| Parallel coordinates | One line per experiment with values on every selected axis; choose at least two properties. Each axis scales independently using those complete records. Reorder axes or activate a line to inspect an experiment. |

Histogram and pie-range bins include their lower bound. Upper bounds are exclusive except for the last bin, which includes the maximum. Constant data uses one bin; extreme floating-point ranges may produce fewer distinct bins. Empty bins remain visible in histograms and are omitted from pies.

Heatmap colors run from −1 (orange) through 0 (neutral) to +1 (blue). They describe linear association, not quality or causation. Opening a cell preserves the current query and zero-input setting.

Selection highlights points and lines or shows selected counts in bins/slices. Inspecting these marks does not add a filter. Axis choices survive view changes; changing chart type retains each type's settings.

## Accessibility and layout

- Points, bars, slices, and lines support keyboard activation. Data tables expose records that overlap visually.
- Heatmaps use one Tab stop: arrows move between cells, Home/End move across a row, Ctrl+Home/End move to matrix endpoints, and Enter opens the scatterplot.
- Dense heatmaps and parallel plots scroll within their containers. Resizing adjusts geometry without dropping properties.
- Tick precision increases when rounding would make distinct values identical. Full property names remain available when labels shorten.
- Tooltips stay inside the plot or flow beneath it when too tall. Missing data and empty results have explicit recovery states.

## Code boundaries

| Layer | Responsibility |
| --- | --- |
| [src/chart-model/](../src/chart-model/) | React-free chart types, catalog, defaults, reducer, and persisted-setting validation. |
| [src/charts/](../src/charts/) | Reusable SVG/table rendering, scales, binning, correlations, and responsive layout; no experiment-layer dependencies. |
| [src/features/charts/](../src/features/charts/) | Experiment adapters, property controls, inspection, and the shared view dispatcher. |

[ExperimentChartView](../src/features/charts/ExperimentChartView.tsx) dispatches through [chartRenderers](../src/features/charts/chartRenderers.tsx). The [catalog](../src/chart-model/registry.ts) supplies type labels, result hints, active properties, zero-input policy, defaults, and settings readers.

All chart defaults and shared property-selection fallbacks live in [defaults.ts](../src/chart-model/defaults.ts); configuration contracts, including axes and swap actions, live in [types.ts](../src/chart-model/types.ts). Import contracts directly from that module.

Each plot renderer lives in `src/charts/` and receives chart data, with experiment preparation in `scatterData.ts`, `histogramData.ts`, `correlationData.ts`, and `parallelData.ts`. Shared record selection, numeric values, and dimension labels live in [experimentData.ts](../src/features/charts/experimentData.ts). Histogram and pie reuse the same value extraction and histogram binning. Renderer styles live in `charts.css`; shared controls and view layout live in `chartViews.css`.

Adapters memoize data preparation against their data/settings inputs. Chart configuration retains identity across unrelated workspace actions. Dashboard layout and title updates can rerender wrappers independently of [DashboardChart](../src/features/dashboards/DashboardChart.tsx); size changes still update geometry.

## Saved settings

[Chart validation](../src/chart-model/validation.ts) supplies defaults for newer fields in supported older dashboards and rejects malformed settings or unknown chart types. Inactive chart settings are retained when switching types.

Legacy 3D settings remain readable, but scatterplots render only X/Y. An old Z property never affects plotted records or zero-input exclusion. Saved plot ranges are ignored and removed on the next dashboard save. See [dashboard persistence](dashboards.md#storage-and-compatibility).

## Add a chart type

1. Extend `ChartType`, its settings, and `ChartSettingsByType` in [types.ts](../src/chart-model/types.ts).
2. Add initial settings in [defaults.ts](../src/chart-model/defaults.ts) and reference them from a [catalog entry](../src/chart-model/registry.ts) with a validated reader. Compose these in [createChartConfiguration](../src/chart-model/configuration.ts) and [validateChartConfiguration](../src/chart-model/validation.ts), including defaults for older saved dashboards.
3. Add actions and reducer cases in [configuration.ts](../src/chart-model/configuration.ts). Workspace and dashboard chart actions use this reducer.
4. Implement an experiment adapter and a view accepting [ChartViewProps](../src/features/charts/ChartViewProps.ts), then register it in [chartRenderers.tsx](../src/features/charts/chartRenderers.tsx). Keep generic math and drawing in `src/charts/`.
5. Test numerical edge cases, missing/zero behavior, saved-setting round trips, and an interaction flow. Run `npm run check` from the repository root.

Calculation and UI tests live in [tests/](../tests/). [Architecture tests](../tests/architecture.test.ts) enforce dependency boundaries; [mounted UI tests](../tests/mounted-ui.test.ts) cover interactions and query/render invalidation.
