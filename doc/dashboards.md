# Dashboards

Expand **Dashboards** in the sidebar to select a dashboard, use **+ Add** to create one, or delete one. A thin neutral marker indicates selection. New dashboards immediately open a focused name field; use the row's pencil action to rename an existing dashboard. Enter or clicking away finishes; Escape restores the previous name. Renaming is available only in the sidebar. First use creates **Experiment overview** with two plots.

**Add plot** creates a live chart directly in edit mode, with its title focused and selected. Existing plots open their settings through **Edit**: title, width, chart type, property selectors, range settings, and removal control. **Done** hides the controls; changes remain in the dashboard draft. Scatterplots, histograms, pie charts, correlation heatmaps, and parallel coordinates retain their own settings when switching types. Duplication is unavailable.

The **Template** dropdown offers Two columns, Stacked, and Featured plot. Templates change placement only. Drag a plot's dotted handle onto another plot to rearrange it; Escape cancels. The handle also supports arrow keys and Home/End for keyboard access. There are no Earlier/Later buttons.

The main view shows the dashboard name as a heading and keeps **Save dashboard** beside the template and plot controls. Saving becomes available after changes, including sidebar renames. Leaving or switching dashboards offers **Save and leave**, **Leave without saving**, or **Keep editing**. Failed saves block navigation. Leaving without saving keeps the draft for this session; refresh/close warns about unsaved drafts and reloads saved versions.

## Code boundaries

| Module | Responsibility |
| --- | --- |
| `src/dashboards/types.ts`, `defaults.ts` | Persisted models and the initial dashboard. |
| `layout.ts` | Layout templates and placement of newly added plots. |
| `validation.ts`, `repository.ts`, `localStorageAdapter.ts` | Validate, migrate, load, save, and delete configurations. |
| `query.ts` | Apply a range to its own plot only. |
| `dashboardReducer.ts`, `useDashboardLibrary.ts` | Draft edits, saved versions, and storage errors. |
| `DashboardList`, `DashboardEditor`, `DashboardWidget` | Sidebar management, dashboard editing, and collapsible plot settings. |
| `DashboardLayoutPicker`, `DashboardCanvas` | Template dropdown, chart creation, and dragging. |
| `src/components/useSortableGrid.ts`, `reorder.ts` | Pointer/touch sorting, keyboard moves, and auto-scroll. |
| `useUnsavedNavigation.ts`, `navigationGuard.ts` | Save-before-leaving prompts and failed-save protection. |
| `ExperimentChartView.tsx` | Shared chart rendering; dashboard controls appear only while editing. |

## Persistence and filters

Configurations use `lablens.dashboards.v1` in local storage. Names, layout, plot order/width, chart settings, cameras, and each plot's range are saved. UI controls, drag previews, and experiment records are not. Storage does not sync across devices.

Plot filters are independent: selecting or clearing a range affects only that plot. Context scatterplot points stay visible for reselection; histograms and all analysis charts use only that plot's matching experiments. Heatmap cell inspection changes that widget to the corresponding scatterplot while retaining its filter. Dashboard-wide search and filters from older saved records are ignored on load and omitted on the next save, preventing invisible filtering. Other plot settings are preserved.

The default is seeded only when storage is absent. Deleting every dashboard leaves an empty library. Invalid saved data is preserved with an error; failed writes never report success.

Tests cover persistence, legacy migration, independent plot filters, layout changes, reordering, and navigation decisions. Run `npm test`, `npm run lint`, and `npm run build`.
