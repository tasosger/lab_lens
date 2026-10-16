# Dashboards

Expand **Dashboards** in the sidebar to select a dashboard, use **+ Add** to create one, or delete one. A thin neutral marker indicates selection. New dashboards immediately open a focused name field; use the row's pencil action to rename an existing dashboard. Enter or clicking away finishes; Escape restores the previous name. Renaming is available only in the sidebar. First use creates **Experiment overview** with two plots.

**Add plot** creates a live chart directly in edit mode, with its title focused and selected. Existing plots open their settings through **Edit**: title, chart type, property selectors, size reset, and removal control. **Done** hides the controls; changes remain in the dashboard draft. Scatterplots, histograms, pie charts, correlation heatmaps, and parallel coordinates retain their own settings when switching types. Duplication is unavailable.

The **Template** dropdown offers Two columns, Stacked, and Featured plot. Templates change placement only. Drag a plot's dotted handle onto another plot or a nearby gap to rearrange it; the highlighted plot indicates the destination. Plots that exceed the destination's width or chart height shrink to fit, within the minimum chart size. The drag preview indicates resizing; dropping commits the move and size together. Escape cancels both. The handle also supports arrow keys and Home/End for keyboard access. There are no Earlier/Later buttons.

Drag a plot's bottom corner handle to resize its width and chart height. Right-side plots use the bottom-left corner; dragging left widens them. Other plots automatically move into available gaps, including below shorter plots. Sizes snap to a responsive grid; narrow screens stack plots without overwriting saved widths. Escape cancels a resize; releasing commits it to the unsaved draft. The resize handle supports arrow keys (Shift for larger steps). **Reset size** restores automatic sizing. Templates reset custom widths while keeping chosen heights.

The main view shows the dashboard name as a heading and keeps **Save dashboard** beside the template and plot controls. Saving becomes available after changes, including sidebar renames. Leaving or switching dashboards offers **Save and leave**, **Leave without saving**, or **Keep editing**. Failed saves block navigation. Leaving without saving keeps the draft for this session; refresh/close warns about unsaved drafts and reloads saved versions.

## Code boundaries

| Module | Responsibility |
| --- | --- |
| `src/dashboards/types.ts`, `defaults.ts` | Persisted models and the initial dashboard. |
| `layout.ts`, `packing.ts` | Templates, resize bounds, and collision-free gap filling. |
| `validation.ts`, `repository.ts`, `localStorageAdapter.ts` | Validate, migrate, load, save, and delete configurations. |
| `dashboardReducer.ts`, `useDashboardLibrary.ts` | Draft edits, saved versions, and storage errors. |
| `DashboardList`, `DashboardEditor`, `DashboardWidget` | Sidebar management, dashboard editing, and collapsible plot settings. |
| `DashboardLayoutPicker`, `DashboardCanvas` | Template dropdown, chart creation, and dragging. |
| `useDashboardResize`, `usePackedDashboard` | Resize previews, keyboard sizing, measured card heights, and responsive packing. |
| `src/components/useSortableGrid.ts`, `reorder.ts` | Pointer/touch sorting, keyboard moves, and auto-scroll. |
| `useUnsavedNavigation.ts`, `navigationGuard.ts` | Save-before-leaving prompts and failed-save protection. |
| `ExperimentChartView.tsx` | Shared chart rendering; dashboard controls appear only while editing. |

## Persistence and filters

Configurations use `lablens.dashboards.v1` in local storage. Names, layout, plot order/width/height, chart settings, and cameras are saved. Older dashboards retain their half/full widths and automatic heights. UI controls, drag/resize previews, measured positions, and experiment records are not saved. Storage does not sync across devices.

Each plot uses the full dataset with its own optional **Exclude zero inputs** setting. Heatmap cell inspection changes that widget to the corresponding scatterplot. Legacy plot ranges and dashboard-wide search/filters are ignored on load and omitted on the next save, preventing invisible filtering. Other plot settings are preserved.

The default is seeded only when storage is absent. Deleting every dashboard leaves an empty library. Invalid saved data is preserved with an error; failed writes never report success.

Tests cover persistence, legacy filter cleanup, independent chart settings, layout changes, reordering, and navigation decisions. Run `npm test`, `npm run lint`, and `npm run build`.
