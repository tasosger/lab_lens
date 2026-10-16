# Dashboards

[Project overview](../README.md) · [Data layer](data-layer.md) · [Charts](charts.md)

Dashboards arrange independently configured charts over the full dataset. Each plot has its own optional **Exclude zero inputs** setting; Explore's search and filters do not apply.

## Editing workflow

1. Use **Dashboards → + Add** to create a dashboard and enter its name. Rename existing dashboards with the sidebar pencil action.
2. **Add plot** opens a chart in edit mode. **Edit** changes an existing plot's title, type, and properties; **Done** closes its controls.
3. Arrange plots with **Template**, drag handles, or corner resize handles.
4. **Save dashboard** persists changes, including names, layout, and chart settings.

The initial **Experiment overview** contains two plots. Switching chart types retains their individual settings. Details of each visualization belong in the [charts guide](charts.md).

## Layout and keyboard controls

Templates offer **Two columns**, **Stacked**, and **Featured plot**. They change placement and reset custom widths while keeping chart content and chosen heights.

| Action | Behavior |
| --- | --- |
| Reorder | Drag a plot handle onto another plot or a nearby gap. A plot too large for its destination shrinks within minimum bounds. Release commits the preview to the draft; Escape cancels. |
| Resize | Drag the bottom corner to change width and chart height. For a left-side handle, dragging left widens the plot. Release commits; Escape restores the previous size. |
| Keyboard | Reorder handles support arrows and Home/End. Resize handles support arrows, with Shift for larger steps. |
| Reset size | Restores automatic sizing. |

Plots fill available gaps without overlap. Narrow screens stack plots while preserving saved desktop widths.

## Drafts and navigation

Edits update an in-memory draft. Closing a plot's controls does not save it. Leaving a dashboard with unsaved changes offers:

| Choice | Result |
| --- | --- |
| **Save and leave** | Saves before navigating. A failed save keeps the editor open and reports the error. |
| **Leave without saving** | Navigates while keeping the draft available for this session. |
| **Keep editing** | Cancels navigation. |

Refreshing or closing the page prompts about unsaved drafts; a reload restores saved versions. Leaving without saving does not discard the session draft.

## Storage and compatibility

Configurations use browser `localStorage` under `lablens.dashboards.v1`. Names, layout, plot order/dimensions, and chart settings are persisted. Experiment records, measured layout positions, and temporary UI/gesture state are not stored. Storage belongs to the current browser and site and does not sync across devices.

The repository seeds the default only when storage is absent. Deleting all dashboards leaves an empty library. Invalid or unsupported saved data is preserved and reported as an error; failed writes never report success.

Older supported dashboards retain their widths and receive defaults for newer chart settings. Legacy plot ranges and dashboard-wide filters/search are ignored on load and omitted on save. Old camera/Z settings remain compatible while scatterplots display X/Y only.

## Code boundaries

| Area | Entry points |
| --- | --- |
| Models and persistence | [src/dashboards/](../src/dashboards/): defaults, validation, repository, and storage adapter. |
| Drafts and saving | [dashboardReducer.ts](../src/features/dashboards/dashboardReducer.ts) and [useDashboardLibrary.ts](../src/features/dashboards/useDashboardLibrary.ts). |
| Editing UI | [src/features/dashboards/](../src/features/dashboards/): sidebar, editor, canvas, and plot controls. |
| Layout | [layout.ts](../src/dashboards/layout.ts), [packing.ts](../src/dashboards/packing.ts), and [useDashboardResize.ts](../src/features/dashboards/useDashboardResize.ts). |
| Shared interactions | [useSortableGrid.ts](../src/components/useSortableGrid.ts) and [useUnsavedNavigation.ts](../src/components/useUnsavedNavigation.ts). |
| Chart integration | [DashboardChart.tsx](../src/features/dashboards/DashboardChart.tsx) renders through the shared [chart model](../src/chart-model/) and views. |

Run `npm run check` from the repository root. [Dashboard tests](../tests/dashboards.test.ts) cover storage and compatibility; layout, packing, and drop tests cover positioning. [Mounted UI tests](../tests/mounted-ui.test.ts) cover gesture commit/cancellation and rendering boundaries.
