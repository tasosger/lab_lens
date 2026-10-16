# Charts

The Charts view supports 2D and 3D scatterplots with shared search/filter results, point inspection, and range filtering. Histograms remain future work.

## Boundaries

| Module | Responsibility |
| --- | --- |
| `src/charts/types.ts` | Dataset-independent point, axis, scale, and layout contracts. |
| `numericScale.ts` | Padded domains, linear projection, ticks, and axis formatting. Pure functions tested separately from React. |
| `useChartSize.ts` | Observe the chart container and adapt its size without shrinking labels. |
| `ChartAxis.tsx` | Numeric ticks, labels, and grid lines for either orientation. |
| `CartesianChart.tsx` | Responsive SVG frame and axes, with render functions for plotted marks and HTML overlays. |
| `ScatterPlot.tsx` | Point rendering, hover/focus values, highlighting, and activation callbacks. |
| `ScatterPlot3D.tsx` | Three-axis SVG projection, depth ordering, cube axes, and three-value tooltips. |
| `projection3D.ts` | Pure property normalization, orthographic projection, camera bounds, and drag calculations. |
| `useOrbitDrag.ts` | Drag rotation/tilt with click suppression, a local non-passive wheel listener for zoom, and background double-click reset. |
| `AxisSwapMenu.tsx` | Compact X/Y, X/Z, and Y/Z swaps, with outside-click, blur, and Escape dismissal. |
| `rangeSelection.ts` | Pure rectangle geometry, clipping, drag thresholds, and conversion between pixels and numeric ranges. |
| `useRangeBrush.ts` / `CartesianBrush.tsx` | Pointer capture, cancellable drag previews, and the reusable SVG selection layer. |
| `rangeInput.ts` / `CartesianRangeEditor.tsx` | Validated numeric bounds and a keyboard-accessible range form. |
| `CartesianRangeControls.tsx` | Reusable selection mode and numeric-entry controls for Cartesian plots. |
| `ChartDataTable.tsx` | Expandable numeric alternative to the plot, including every overlapping point. |
| `src/components/PropertySelect.tsx` | Reusable picker with input/output optgroups and stable property IDs. |
| `src/features/charts/scatterData.ts` | Default experiment axes and adaptation of experiment records to generic points. |
| `ScatterPlotView.tsx` | Experiment controls, empty states, missing-value count, and wiring to shared chart components. |
| `propertyRangeFilter.ts` / `PlotRangeFilterControls.tsx` | Bind ranges to property IDs, convert to numeric filters, and edit or clear the active plot filter. |
| `workspaceReducer.ts` | Active view and axis choices, alongside shared query, selection, and detail state. |

Components in `src/charts/` do not import experiment data or workspace state. Add another Cartesian chart by supplying marks to `CartesianChart`; another scatterplot use case can provide its own point adapter and activation callback. Future chart types can reuse `PropertySelect` and the existing filter results without duplicating query logic. No charting dependencies are required for this small SVG plot.

## Data and interaction rules

- Axes accept any discovered input or output, including the same property on both axes. Defaults prefer Oven Temperature and Tensile Strength, with fallbacks for other datasets.
- Charts and the table share the same query. The scatterplot also keeps points excluded by its own range as faint, hollow context; its data table lists matching points. Comparison membership still comes from the full dataset.
- Zero is a coordinate. Missing axis values omit an experiment from the plot and increment the visible omission count.
- Domains pad the observed range rather than forcing a zero baseline. Empty, constant, negative, and extreme finite ranges remain usable.
- Original coordinates are preserved: overlapping points are not jittered. Every point is focusable and also appears in the data table.
- Hover/focus shows values; click or Enter/Space opens details. Selecting in details updates the shared selection and plot highlight.
- Axis choices survive view changes and query resets; a page refresh resets the workspace.
- Labels retain source property names. Units are not invented.
- 2D remains the default. 3D adds a Z property (Elongation by default). Every plotted record must contain all three measurements, including valid zeros.
- The 3D camera rotates independently normalized property ranges and draws points from back to front. Original values appear in tooltips and the data table, which adds a Z column.
- The chart-type selector chooses 2D or 3D scatterplots. Mode, Z selection, and camera settings survive view changes. Mouse dragging rotates and tilts; scrolling over the plot zooms; double-clicking the background resets only the camera. Existing plot ranges remain active in 3D; drawing a new range uses 2D.
- All three axis pairs can be exchanged. Swaps retain property-bound filters, selections, and camera settings.
- `tests/charts-3d.test.ts` covers Z values, missing triples, projection, camera bounds, and state preservation.

## Filtering from the plot

Choose **Select range**, then drag a rectangle. Releasing applies inclusive X and Y ranges; small clicks do nothing, and Escape or pointer cancellation discards the preview. **Finish selecting** restores pointer inspection. **Enter numeric bounds** provides the same filtering by keyboard.

Both ranges combine with the existing filter tree using AND, preserving nested OR groups. A new selection replaces the previous plot range. **Edit plot range** changes exact bounds; **Clear plot range** preserves manual filters and search. Global filter resets clear both.

Axes stay stable while brushing because their domains use results before the plot range. Zero matches still leave context points available for another selection. Ranges remain tied to their original property IDs across axis changes; swapping axes swaps the displayed rectangle. The range survives view changes and resets on refresh.

`tests/charts.test.ts` and `tests/chart-filtering.test.ts` cover data adaptation, scales, range conversion, numeric input, and repository/workspace integration. Run `npm test`, `npm run lint`, and `npm run build` from the app directory.
