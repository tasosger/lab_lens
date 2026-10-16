# Charts

The Charts view offers Scatterplot, Histogram, Pie chart, Correlation heatmap, and Parallel coordinates. Two scatterplot axis values render in 2D, and adding a third renders in 3D. All types use matching search/filter results and are available in dashboard widgets. Experiment selection highlights individual marks or shows subset counts; heatmaps summarize the entire matching set.

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
| `ScatterPlot3D.tsx` | Three-axis SVG projection, depth ordering, cube axes, and three-value tooltips. |
| `projection3D.ts` | Pure property normalization, orthographic projection, camera bounds, pointer-anchored zoom interpolation, and drag calculations. |
| `useOrbitDrag.ts` | Drag rotation/tilt and Shift-drag panning with click suppression, animated wheel/pinch zoom, and background double-click reset. |
| `AxisSwapMenu.tsx` | Compact X/Y, X/Z, and Y/Z swaps, with outside-click, blur, and Escape dismissal. |
| `rangeSelection.ts` | Pure rectangle geometry, clipping, drag thresholds, and conversion between pixels and numeric ranges. |
| `useRangeBrush.ts` / `CartesianBrush.tsx` | Pointer capture, cancellable drag previews, and the reusable SVG selection layer. |
| `rangeInput.ts` / `CartesianRangeEditor.tsx` | Validated numeric bounds and a keyboard-accessible range form. |
| `CartesianRangeControls.tsx` | Reusable selection mode and numeric-entry controls for Cartesian plots. |
| `ChartDataTable.tsx` | Expandable numeric alternative to the plot, including every overlapping point. |
| `src/components/PropertySelect.tsx` | Reusable picker with input/output optgroups and stable property IDs. |
| `src/features/charts/scatterData.ts` | Default experiment axes and adaptation of experiment records to generic points. |
| `ScatterPlotView.tsx` | Experiment controls, empty states, missing-value count, and wiring to shared chart components. |
| `ScatterPlotControls.tsx` | Shared value pickers, add/remove controls, and inline validation errors for Charts and dashboard plots. |
| `chartConfiguration.ts` | Shared chart defaults, setting changes, and the three-value limit for Charts and dashboard widgets. |
| `propertyRangeFilter.ts` / `PlotRangeFilterControls.tsx` | Bind ranges to property IDs, convert to numeric filters, and edit or clear the active plot filter. |
| `workspaceReducer.ts` | Active view and axis choices, alongside shared query, selection, and detail state. |

Components in `src/charts/` do not import experiment data or workspace state. Add another Cartesian chart by supplying marks to `CartesianChart`; another scatterplot use case can provide its own point adapter and activation callback. Chart types reuse property controls and the existing filter results without duplicating query logic. Rendering uses SVG or semantic HTML tables without charting dependencies.

## Histograms

Choose **Histogram** in **Chart type**, select an input or output, and use **Auto** bins or an explicit count from 1 to 50. Auto uses the ceiling of the square root of the recorded-value count, capped at 50. Bins span the observed minimum and maximum with equal widths; extremely narrow floating-point ranges may have fewer distinct boundaries. A constant series uses one bin. Counts always start at zero and use integer axis labels.

Each lower bound is inclusive. Upper bounds are exclusive except for the final bin, which includes the maximum. Missing measurements are omitted and reported, and zero is a recorded value. Every recorded measurement belongs to exactly one bin.

Histograms count only the matching experiments, including all active manual filters, search, and plot ranges. They do not include the extra context records used by scatterplot brushing. The dark segment is the selected subset of the total bar. Click a bar or use Enter/Space to inspect its experiment IDs and values; the ID buttons open the existing details drawer. **View bin counts** provides a keyboard-accessible table. Inspecting a bin does not change filters.

Chart type, histogram property, and bin count live in the shared chart configuration and persist with saved dashboards. Scatterplot axes and camera settings are retained when switching types. Older v1 dashboard configurations without histogram fields load as scatterplots with automatic bins.

`tests/histogram.test.ts` covers bin endpoints, duplicates, zeros, missing values, constant/empty data, extreme finite ranges, matching queries, chart state, persistence, and older dashboard compatibility.

## Pie charts

Choose one input or output and group by **Exact values** or **Value ranges**. Range grouping reuses the histogram rules (default 5 bins, Auto or 1–50); empty bins do not produce slices. Exact values are sorted numerically, and labels fall back to full precision if formatting would make distinct values look identical. A constant property produces one complete circle.

Slices count experiments rather than summing measurements. Shares use the number of finite recorded values as their denominator. Missing values are reported separately, and zeros are retained. The legend gives counts, percentages, and selected subset counts. Clicking or keyboard-activating a slice or label reveals its experiments and their details buttons. Inspection does not alter filters.

## Correlation heatmaps

X columns and Y rows independently accept any discovered input or output; defaults compare output columns with input rows. Each checklist supports Inputs only, Outputs only, All, and Clear. The matrix scrolls with fixed row and column labels. Cells show Pearson's r to two decimals and the paired finite observation count. Hover text and accessible labels provide three decimals and the unavailable reason. Missing values are excluded pairwise; fewer than three pairs or a constant property produces N/A, not zero.

The diverging color scale remains fixed from −1 (orange) through 0 (neutral) to +1 (blue). Color describes correlation direction, not quality. Clicking a cell opens a 2D scatterplot for that exact X/Y pair while retaining filters and heatmap selections. Returning to the heatmap restores its choices. Correlation summarizes linear association and does not establish causation.

## Parallel coordinates

Choose at least two properties, then move them earlier or later in **Axes · left to right**. Each selected property has its own padded numeric scale and input/output label. Lines use only matching experiments with finite values on every selected axis; missing-record omissions are counted. Domain calculation uses the same complete records that are drawn.

Selected experiments render darker and above unselected lines. Hover/focus highlights a line and displays its original measurements; click or Enter/Space opens details. **View experiment values** lists all lines, including identical or overlapping paths. Many axes scroll horizontally so labels and scales stay legible.

Settings for all chart types are independent in `ChartConfiguration`. Dashboard validation supplies defaults for fields absent from older saved configurations, preserves existing settings, and validates property IDs, unique axis lists, grouping, and bin counts. An empty selection can be saved as a draft configuration and renders recovery guidance. `tests/analysis-charts.test.ts` covers calculations, missing values, filtering, settings, and persistence; `tests/analysis-charts-ui.test.ts` checks rendering, control visibility, accessible alternatives, and empty states.

## Scatterplots

- Axes accept any discovered input or output, including the same property on both axes. Defaults prefer Oven Temperature and Tensile Strength, with fallbacks for other datasets.
- Charts and the table share the same query. The scatterplot also keeps points excluded by its own range as faint, hollow context; its data table lists matching points. Comparison membership still comes from the full dataset.
- Zero is a coordinate. Missing axis values omit an experiment from the plot and increment the visible omission count.
- Domains pad the observed range rather than forcing a zero baseline. Empty, constant, negative, and extreme finite ranges remain usable.
- Original coordinates are preserved: overlapping points are not jittered. Every point is focusable and also appears in the data table.
- Hover/focus shows values; click or Enter/Space opens details. Selecting in details updates the shared selection and plot highlight.
- Axis choices survive view changes and query resets; a page refresh resets the workspace.
- Labels retain source property names. Units are not invented.
- Two values (X and Y) remain the default. **Add value** adds a Z property (Elongation by default) and automatically renders in 3D. Removing Z returns to 2D and retains the last Z choice for reuse. Trying to add a fourth value shows an inline validation error and preserves the current plot. Every plotted record must contain all active axis measurements, including valid zeros.
- The 3D camera rotates independently normalized property ranges and draws points from back to front. Original values appear in tooltips and the data table, which adds a Z column.
- The chart-type selector has a single **Scatterplot** option; dimensionality follows the number of axis values. Mode, Z selection, and camera settings survive view changes. Mouse dragging rotates and tilts; scrolling or trackpad pinching over the plot smoothly zooms toward the pointer from 0.25× to 6×. Shift-drag pans a magnified view, and double-clicking the background resets the camera. Existing plot ranges remain active in 3D; drawing a new range uses 2D.
- Wheel input accumulates toward a target camera and is eased on animation frames; dragging, resetting, loading another camera, or unmounting cancels pending zoom motion. Pan offsets use viewport fractions and are saved with dashboard cameras; older saved cameras without offsets still load centered.
- All three axis pairs can be exchanged. Swaps retain property-bound filters, selections, and camera settings.
- `tests/charts-3d.test.ts` covers Z values, missing triples, projection, camera bounds, and state preservation.
- `tests/chart-configuration.test.ts` covers adding/removing depth and rejecting a fourth value without changing the active chart.

## Filtering from the plot

Choose **Select range**, then drag a rectangle. Releasing applies inclusive X and Y ranges; small clicks do nothing, and Escape or pointer cancellation discards the preview. **Finish selecting** restores pointer inspection. **Enter numeric bounds** provides the same filtering by keyboard.

Both ranges combine with the existing filter tree using AND, preserving nested OR groups. A new selection replaces the previous plot range. **Edit plot range** changes exact bounds; **Clear plot range** preserves manual filters and search. Global filter resets clear both.

Axes stay stable while brushing because their domains use results before the plot range. Zero matches still leave context points available for another selection. Ranges remain tied to their original property IDs across axis changes; swapping axes swaps the displayed rectangle. The range survives view changes and resets on refresh.

`tests/charts.test.ts` and `tests/chart-filtering.test.ts` cover data adaptation, scales, range conversion, numeric input, and repository/workspace integration. Run `npm test`, `npm run lint`, and `npm run build` from the app directory.
