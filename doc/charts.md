# Charts

The Charts view offers Scatterplot, Histogram, Pie chart, Correlation heatmap, and Parallel coordinates. Scatterplots display two properties on X/Y axes. All types use matching search/filter results and are available in dashboard widgets. Experiment selection highlights individual marks or shows subset counts; heatmaps summarize the entire matching set.

## Boundaries

| Module | Responsibility |
| --- | --- |
| `src/charts/types.ts` | Dataset-independent point, axis, scale, and layout contracts. |
| `numericScale.ts` | Padded domains, linear projection, ticks, and axis formatting. Pure functions tested separately from React. |
| `useChartSize.ts` | Observe the chart container and adapt its size without shrinking labels. |
| `ChartAxis.tsx` | Numeric ticks, labels, and grid lines for either orientation. |
| `CartesianChart.tsx` | Responsive SVG frame and axes, with render functions for plotted marks and HTML overlays. |
| `ScatterPlot.tsx` | Point rendering, hover/focus values, highlighting, and activation callbacks. |
| `histogram.ts` / `HistogramPlot.tsx` | Pure equal-width binning and responsive bars with integer count ticks and selected subsets. |
| `pie.ts` / `PiePlot.tsx` | Exact-value or range groups, count shares, and keyboard-accessible pie slices. |
| `correlation.ts` | Pairwise finite observations, sample counts, stable Pearson correlation, and unavailable reasons. |
| `ParallelCoordinatesPlot.tsx` | Independently scaled axes, experiment lines, keyboard activation, and hover/focus values. |
| `src/features/charts/analysisData.ts` | Matching experiment records, property values, correlation matrix, and complete parallel-coordinate records. |
| `PieChartView.tsx`, `CorrelationHeatmapView.tsx`, `ParallelCoordinatesView.tsx` | Analysis controls, summaries, empty states, and inspection interactions. |
| `PropertyMultiSelect.tsx` | Independent input/output checklists, selection presets, and ordered axes. |
| `src/features/charts/histogramData.ts` / `HistogramView.tsx` | Matching experiment values, histogram controls, empty states, bin counts, and experiment inspection. |
| `ExperimentChartView.tsx` / `ChartTypeSelect.tsx` | Shared chart dispatch and chart-type selection for Charts and dashboards. |
| `AxisSwapMenu.tsx` | X/Y swap control, with outside-click, blur, and Escape dismissal. |
| `ChartDataTable.tsx` | Expandable numeric alternative to the plot, including every overlapping point. |
| `src/components/PropertySelect.tsx` | Reusable picker with input/output optgroups and stable property IDs. |
| `src/features/charts/scatterData.ts` | Adapt experiment records to generic points. Default axes live in `src/chart-model/scatter.ts`. |
| `ScatterPlotView.tsx` | Experiment controls, empty states, missing-value count, and wiring to shared chart components. |
| `ScatterPlotControls.tsx` | Shared X/Y property pickers and axis swapping for Charts and dashboard plots. |
| `src/chart-model/` | React-free chart contracts, catalog, defaults, setting changes, and persisted-setting validation. |
| `chartRenderers.tsx` | Exhaustive map of chart types to views with a common `ChartViewProps` contract. |
| `workspaceReducer.ts` | Active view and axis choices, alongside shared query, selection, and detail state. |

Components in `src/charts/` do not import experiment data or workspace state. Add another Cartesian chart by supplying marks to `CartesianChart`; another scatterplot use case can provide its own point adapter and activation callback. Chart types reuse property controls and the existing filter results without duplicating query logic. Rendering uses SVG or semantic HTML tables without charting dependencies.

Tick labels increase their precision when distinct values would otherwise display identically, and duplicate floating-point tick positions are removed. Axis names are shortened on grapheme boundaries, preserving emoji and combining characters; full names remain in SVG titles. Shared tooltips measure their height and stay within the plot, or flow below it when their content is too tall.

## Histograms

Choose **Histogram** in **Chart type**, select an input or output, and use **Auto** bins or an explicit count from 1 to 50. Auto uses the ceiling of the square root of the recorded-value count, capped at 50. Bins span the observed minimum and maximum with equal widths; extremely narrow floating-point ranges may have fewer distinct boundaries. A constant series uses one bin. Counts always start at zero and use integer axis labels.

Each lower bound is inclusive. Upper bounds are exclusive except for the final bin, which includes the maximum. Missing measurements are omitted and reported, and zero is a recorded value. Every recorded measurement belongs to exactly one bin.

Histograms count only the matching experiments after search, numeric filters, and optional zero-input exclusion. The dark segment is the selected subset of the total bar. Click a bar or use Enter/Space to inspect its experiment IDs and values; the ID buttons open the existing details drawer. **View bin counts** provides a keyboard-accessible table. Inspecting a bin does not change filters.

Chart type, histogram property, and bin count live in the shared chart configuration and persist with saved dashboards. Scatterplot axes and camera settings are retained when switching types. Older v1 dashboard configurations without histogram fields load as scatterplots with automatic bins.

`tests/histogram.test.ts` covers bin endpoints, duplicates, zeros, missing values, constant/empty data, extreme finite ranges, matching queries, chart state, persistence, and older dashboard compatibility.

## Excluding absent inputs

Charts that use an ingredient input show a compact **Exclude zero inputs** checkbox. It defaults off and applies only to the chart's active properties: one property for pie/histogram, X/Y for scatterplots, or the chosen parallel axes. Zero amounts on unrelated inputs never exclude a record. Output and process zeros remain valid. Missing values still follow each chart's existing omission rules and are reported separately from explicitly excluded zeros.

Filtering happens before bins, percentages, or numeric domains are computed. Heatmaps exclude zeros independently for each pair and update the paired count, avoiding an intersection across all selected ingredients. Opening a heatmap cell retains the checkbox state in the resulting scatterplot. The flag persists per dashboard widget with a backward-compatible default; source records, workspace queries, comparisons, and dataset reference statistics are unchanged. Tests in `chart-zero-inputs.test.ts` and `chart-zero-inputs-ui.test.ts` cover counts, scope, restoration, persistence, and the visible control.

## Pie charts

Choose one input or output and group by **Exact values** or **Value ranges**. Range grouping reuses the histogram rules (default 5 bins, Auto or 1–50); empty bins do not produce slices. Exact values are sorted numerically, and labels fall back to full precision if formatting would make distinct values look identical. A constant property produces one complete circle.

Slices count experiments rather than summing measurements. Shares use the number of finite recorded values as their denominator. Missing values are reported separately, and zeros are retained. The legend gives counts, percentages, and selected subset counts. Clicking or keyboard-activating a slice or label reveals its experiments and their details buttons. Inspection does not alter filters.

## Correlation heatmaps

X columns and Y rows independently accept any discovered input or output; defaults compare output columns with input rows. Each checklist supports Inputs only, Outputs only, All, and Clear. The matrix scrolls with fixed row and column labels. Cells show Pearson's r to two decimals and the paired finite observation count. Hover text and accessible labels provide three decimals and the unavailable reason. Missing values are excluded pairwise; fewer than three pairs or a constant property produces N/A, not zero.

Cells retain at least 28 pixels in each dimension. Dense matrices scroll inside a bounded viewport, including when a dashboard supplies a plot height; all cells remain available. The matrix has one Tab stop. Arrow keys move between cells, Home/End move across a row, Control+Home/End reach the first/last cell, and Enter opens the scatterplot. Tab exits the matrix.

The diverging color scale remains fixed from −1 (orange) through 0 (neutral) to +1 (blue). Color describes correlation direction, not quality. Clicking a cell opens a 2D scatterplot for that exact X/Y pair while retaining filters and heatmap selections. Returning to the heatmap restores its choices. Correlation summarizes linear association and does not establish causation.

## Parallel coordinates

Choose at least two properties, then move them earlier or later in **Axes · left to right**. Each selected property has its own padded numeric scale and input/output label. Lines use only matching experiments with finite values on every selected axis; missing-record omissions are counted. Domain calculation uses the same complete records that are drawn.

Selected experiments render darker and above unselected lines. Hover/focus highlights a line and displays its original measurements; click or Enter/Space opens details. **View experiment values** lists all lines, including identical or overlapping paths. Many axes scroll horizontally so labels and scales stay legible.

Settings for all chart types are independent in `ChartConfiguration`. Dashboard validation supplies defaults for fields absent from older saved configurations, preserves existing settings, and validates property IDs, unique axis lists, grouping, and bin counts. An empty selection can be saved as a draft configuration and renders recovery guidance. `tests/analysis-charts.test.ts` covers calculations, missing values, filtering, settings, and persistence; `tests/analysis-charts-ui.test.ts` checks rendering, control visibility, accessible alternatives, and empty states.

## Scatterplots

- Axes accept any discovered input or output, including the same property on both axes. Defaults prefer Oven Temperature and Tensile Strength, with fallbacks for other datasets.
- Charts and the table share the same search and numeric filters. Scatterplots draw only matching experiments, with optional chart-local zero-input exclusion. Comparison membership still comes from the full dataset.
- Zero is a coordinate. Missing axis values omit an experiment from the plot and increment the visible omission count.
- Domains pad the observed range rather than forcing a zero baseline. Empty, constant, negative, and extreme finite ranges remain usable.
- Original coordinates are preserved: overlapping points are not jittered. Every point is focusable and also appears in the data table.
- Hover/focus shows values; click or Enter/Space opens details. Selecting in details updates the shared selection and plot highlight.
- Axis choices survive view changes and query resets; a page refresh resets the workspace.
- Labels retain source property names. Units are not invented.
- Scatterplots always display X/Y values. There is no Z-axis picker, add-value button, or 3D camera interaction.
- Saved 3D configurations remain readable and display their X/Y properties in 2D. Missing or zero values on an old Z property do not omit records or affect zero-input exclusion. Legacy configuration fields are preserved for storage compatibility.
- Swapping X/Y retains property-bound filters and selections.
- `tests/scatterplot-2d-ui.test.ts` covers standalone controls, saved 3D dashboard rendering, X/Y values, and missing legacy Z values. `tests/chart-zero-inputs.test.ts` verifies that old Z settings do not exclude experiments.

## Filtering experiments

Use **Filters** to combine percentile or absolute-value conditions, including nested AND/OR groups. The chart and its data table use the resulting experiments. **Exclude zero inputs** remains available for the chart's chosen ingredient inputs.

Scatterplot range selection, numeric-bound controls, and faded out-of-range context points have been removed. Old dashboard plot ranges are ignored on load and omitted on the next save; other chart settings are preserved.

Axis domains follow the experiments actually plotted. When no experiments match, the chart shows an empty state with a reset action.

`tests/charts.test.ts`, `tests/chart-filtering.test.ts`, and `tests/scatterplot-2d-ui.test.ts` cover data adaptation, scales, workspace filtering, and rendering. Dashboard tests cover legacy range cleanup. Run `npm test`, `npm run lint`, and `npm run build` from the app directory.

## Adding a chart type

1. Add its settings to `src/chart-model/types.ts` and its type-to-settings entry in `ChartSettingsByType`.
2. Add a catalog entry in `registry.ts`: label, result hint, active property IDs, zero-input policy, defaults, and a validated settings reader. Compose its settings in `createChartConfiguration` and `validateChartConfiguration`; include defaults for older saved dashboards.
3. Add the required actions and reducer cases in `configuration.ts`. Workspace chart actions delegate automatically; dashboard actions already use the same reducer.
4. Implement an experiment adapter and a view accepting `ChartViewProps`, then register it in `chartRenderers.tsx`. Generic drawing/math belongs in `src/charts/`; experiment-specific behavior belongs in `src/features/charts/`.
5. Test numerical edge cases, missing/zero semantics, persisted round-trips, and an interactive flow. Run `npm run check`.

The type picker, result hints, and zero-input discovery consume the catalog automatically. Both Charts and dashboards dispatch through the same exhaustive renderer map. Unsupported saved chart types fail validation instead of falling through to a scatterplot.

## Rendering boundaries

Workspace chart settings have a stable identity across drawer/navigation/query changes. The shared chart dispatcher is memoized; each adapter memoizes expensive data preparation against its actual data/settings inputs. Dashboard layout wrappers can update independently of `DashboardChart`. Height context and ResizeObserver still update geometry when plots resize, without rerunning dataset queries. Mounted tests in `tests/mounted-ui.test.ts` verify these invalidation rules and interaction behavior.
