# Design Overview

## Architecture
The app is organized by feature modules with a small shared layer:

- `app`: top-level state and composition.
- `features/network-graph`: D3 scene and graph behavior.
- `features/controls`: color field selection.
- `features/legend`: field value legend.
- `features/instructions`: first-load usage guidance.
- `shared`: common constants and metadata utilities.

## Network Graph Responsibilities
`network-graph` separates concerns into focused modules:
- `constants/graphConstants.js`: graph sizing and interaction thresholds.
- `transforms/groups.js`: connected-component/group derivation.
- `transforms/colors.js`: value extraction, color-map generation, node color resolution.
- `transforms/geometry.js`: node clamping and link/arrow path geometry.
- `render/clusters.js`: clustered cloud rendering helpers.

The main graph component still orchestrates D3 lifecycle creation and runtime event wiring, while relying on extracted pure helpers for reusable logic. Unused placeholder hook/render modules were removed to keep the feature surface aligned with active runtime code.

## Data Flow
1. `App` loads preprocessed network JSON.
2. `NetworkGraph` derives color maps and group metadata.
3. D3 simulation initializes node/link positions.
4. Controls update `colorBy`.
5. Graph recolors nodes and cluster clouds.
6. Legend reflects current field/value mapping.

## Extension Points
- Add new color strategies in `transforms/colors.js`.
- Add filtering dimensions via `shared/utils/fieldMetadata.js`.
- Expand render modularization by moving more D3 scene creation into `render/*` when those modules are introduced with real call sites.
- Introduce hooks only when they are consumed by the graph entry lifecycle, to avoid placeholder drift.
