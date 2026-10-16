# Dashboards

Open **Dashboards** in the sidebar. First use saves an **Experiment overview** dashboard with two 2D plots: Oven Temperature versus Tensile Strength, and Viscosity versus Tensile Strength.

Create, rename, duplicate, or delete dashboards. Each plot has its own title, axes, 2D/3D mode, camera, and half/full width. Use **Earlier/Later** to reorder plots. **Save dashboard** persists the current configuration; the status identifies unsaved changes. Switching views or dashboards retains drafts. A browser refresh restores saved versions.

## Code boundaries

| Module | Responsibility |
| --- | --- |
| `src/dashboards/types.ts` | Persisted dashboard, widget, repository, and storage contracts. |
| `defaults.ts` | New dashboards, plot defaults, and the initial two-plot dashboard. |
| `validation.ts` | Validate saved structure, properties, filters, ranges, and storage version. |
| `repository.ts` / `localStorageAdapter.ts` | Save, load, and delete through an injectable storage adapter. |
| `query.ts` | Combine shared filters with each widget's range. |
| `src/features/dashboards/dashboardReducer.ts` | Pure draft edits and widget operations. |
| `useDashboardLibrary.ts` | Saved versions, retained drafts, storage failures, and save status. |
| `DashboardList`, `DashboardEditor`, `DashboardWidget` | Library navigation, dashboard controls, and chart cards. |
| `chartConfiguration.ts` / `filterEditorState.ts` | Shared chart settings and filter editing, also used by the existing workspace. |

## Persistence and filters

Configurations live under `lablens.dashboards.v1` in this browser's local storage. The saved payload includes names, plot order/size, axes, camera, search, nested filters, and plot ranges. Experiment records, hover states, and open controls are not stored. Browser storage does not sync across devices.

The default is seeded only when storage is absent. Existing dashboards are never overwritten by seeding, and deleting every dashboard leaves an empty library. Invalid saved data is preserved with an error; failed writes never show a successful save.

Shared filters and widget ranges combine with AND. Each source chart excludes its own range from its context query, keeping points available for reselection; other charts apply that range. Removing a widget removes its range. Dashboard queries are independent of Explore/Charts filters.

`tests/dashboards.test.ts` covers initialization, persistence, failure recovery, independent chart edits, nested filters, and linked queries. Run `npm test`, `npm run lint`, and `npm run build`.
