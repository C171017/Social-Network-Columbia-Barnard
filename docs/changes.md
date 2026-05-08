# Change Log

## 2026-05-08 - Feature-based structure baseline
- Scope: refactor
- Files: `src/app/App.js`, `src/App.js`, `src/features/controls/ControlPanel.js`, `src/features/legend/Legend.js`, `src/features/instructions/InstructionModal.js`, `src/components/ControlPanel.js`, `src/components/Legend.js`, `src/components/InstructionModal.js`
- Summary: Introduced feature-based UI module folders and switched legacy component files to compatibility re-exports to preserve existing import paths during transition.
- Follow-ups: Continue migrating remaining imports to feature paths directly.

## 2026-05-08 - Shared utility extraction
- Scope: refactor
- Files: `src/shared/constants/colorPalette.js`, `src/shared/utils/fieldMetadata.js`, `src/features/controls/ControlPanel.js`, `src/features/legend/Legend.js`
- Summary: Centralized duplicated palette and field parsing/labeling behavior into shared modules consumed by controls and legend features.
- Follow-ups: Add unit tests for shared utility edge cases.

## 2026-05-08 - Network graph helper modularization
- Scope: refactor
- Files: `src/features/network-graph/constants/graphConstants.js`, `src/features/network-graph/transforms/groups.js`, `src/features/network-graph/transforms/colors.js`, `src/features/network-graph/transforms/geometry.js`, `src/features/network-graph/render/clusters.js`, `src/features/network-graph/interactions/zoomPan.js`, `src/components/NetworkGraph.js`
- Summary: Extracted core graph constants and pure transform/render helpers into dedicated feature modules and wired the legacy graph component to consume extracted helpers incrementally.
- Follow-ups: Move full scene lifecycle logic into `hooks/*` and `render/*` modules.

## 2026-05-08 - Documentation system added
- Scope: docs
- Files: `docs/introduction.md`, `docs/design.md`, `docs/agent-doc-maintenance.md`, `docs/changes.md`
- Summary: Added project introduction/design docs plus explicit agent instructions requiring docs and changelog updates for substantive future changes.
- Follow-ups: none

## 2026-05-08 - Safe-plus complexity cleanup
- Scope: refactor
- Files: `src/features/network-graph/hooks/*`, `src/features/network-graph/render/{defs.js,nodes.js,links.js}`, `src/features/network-graph/interactions/zoomPan.js`, `src/data/(major unclened)network_data.json`, `src/app/App.js`, `src/components/NetworkGraph.js`, `src/features/network-graph/transforms/geometry.js`, `src/shared/utils/fieldMetadata.js`, `src/components/{ControlPanel.js,Legend.js,InstructionModal.js}`, `src/features/network-graph/NetworkGraph.js`, `src/components/{ControlPanel.test.js,Legend.test.js}`
- Summary: Removed dead scaffold files and wrapper indirection, simplified app/runtime wiring, deduplicated node and arrow rendering paths in the graph, and trimmed unused utility exports while preserving behavior.
- Follow-ups: If future graph modularization resumes, reintroduce hook/render modules only with active call sites.
