# Columbia Network Visualization

## Core Idea
This project visualizes social-network relationship data from Columbia/Barnard as an interactive graph. Nodes represent people and links represent connections. The graph supports zooming, panning, node dragging, group focus, and field-based coloring.

## How To Use
- Start the app with `npm start`.
- Change the active color field from the control panel.
- Click a node to toggle group highlighting.
- Zoom out to see large groups represented as cloud clusters.

## Project Layout
- `src/app/`: app shell and root composition.
- `src/features/network-graph/`: graph-specific constants, transforms, interactions, hooks, and rendering helpers.
- `src/features/controls/`: color-by selector UI.
- `src/features/legend/`: legend UI and value-to-color display.
- `src/features/instructions/`: onboarding modal.
- `src/shared/`: cross-feature constants and utilities.
- `src/data/`: runtime JSON assets used by the app.
- `docs/`: design/maintenance/changelog documentation.

## Data Pipeline
Raw and preprocessing scripts live outside runtime `src/`:
- `data/`: source/intermediate datasets.
- `script/`: conversion/processing scripts that generate runtime JSON for `src/data/`.
