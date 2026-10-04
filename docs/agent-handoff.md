# Archly Agent Handoff

## Handoff Date

2026-10-03

## Current Phase

Phase 1A: guest canvas (in progress). Phase 1B has not started.

## Completed In This Session

- Expanded the React Flow canvas as the main workspace and added independent build/settings panel toggles. The right panel starts closed.
- Changed component selection so it no longer opens the inspector automatically; added an explicit Component details toolbar action.
- Added inline component name editing by double-clicking anywhere on a component, with Enter/blur to save and Escape to cancel.
- Added selectable arrows with addable, draggable bend points that persist in optional edge data; existing saved edges load through the new custom edge renderer.
- Added browser fullscreen for the canvas, fits the graph on entry, and exits through Escape.
- Updated canvas guidance, `PROJECT_MEMORY.md`, `PHASE_PLAN.md`, `docs/decisions.md`, and `docs/current-status.md`.

## Verification

- Testing was not run in this handoff, per the user's instruction that another agent will test.
- Review `docs/canvas-ui-testing-checklist.md` for panel, inline editing, route shaping/persistence, fullscreen/escape, and regression checks.
- The prior coding session recorded TypeScript and the existing six tests passing, before these arrow and fullscreen changes.
- There are no application route handlers, Docker/Compose files, or account/cloud services in the current phase.

## Current Working State

The repository has uncommitted changes. Inspect `git status --short --untracked-files=all` before staging or committing. The test suite is in `apps/web/src/lib`.

## Next Recommended Task

Testing agent: review `docs/canvas-ui-testing-checklist.md` and `apps/web/docs/canvas-editing-testing-checklist.md` for import recovery and canvas interactions; report results and keep Phase 1B deferred.

## Important Context

- Guest diagrams are stored in the current browser profile's IndexedDB database, `archly-guest-canvas`; they do not sync across devices.
- JSON export and validated import as a new local canvas are implemented; cloud recovery is not.
- The graph is the canonical diagram representation. Validate it with the Zod schemas at persistence boundaries.
- The connection palette offers HTTPS request, data flow, and event publish. Select a template, then click source and destination nodes. Dragging between handles remains supported.
- There is no API, authentication, cloud persistence, AI, Redis, RabbitMQ, Socket.IO, or worker implementation. Sign-in is a placeholder.
- Read `AGENTS.md`, `PROJECT_MEMORY.md`, `PHASE_PLAN.md`, and `docs/decisions.md` before implementation. Keep phase documentation synchronized with code.

## Known Problems

- Automated coverage currently includes graph validation and local diagram persistence; the updated canvas UI has not been browser-tested.
- Browser-storage recovery/import is not implemented; local data may be lost if browser storage is cleared or evicted.
- Edge label/style editing and complete undo coverage are missing.
- Node placement uses a small repeating grid and may overlap as more components are added.

## Do Not Do

- Do not start Phase 1B or add authentication/cloud sync before guest import/merge, conflict, and provider decisions are reviewed.
- Do not add Redis, RabbitMQ, Socket.IO, AI, code import, voice, or workers to Phase 1A without an explicit scope discussion.
- Do not treat IndexedDB guest storage as cross-browser/device persistence or as the only safe copy of user work.

## Latest canvas editing change (2026-10-03)

- Added empty-canvas marquee selection for fully enclosed components and group dragging.
- Added copy/paste for selected components, internal arrows, and persisted arrow bends.
- Added keyboard undo/redo and expanded the separate QA checklist at `apps/web/docs/canvas-editing-testing-checklist.md`.
- No tests, type checks, lint, builds, or browser checks were run per the user's instruction.

## Next Recommended Task

Testing agent: review the JSON backup import/recovery scenarios and the recent canvas editing scenarios in `apps/web/docs/canvas-editing-testing-checklist.md`; report browser, viewport, outcomes, and issues. Keep Phase 1B deferred.

## JSON backup import (2026-10-04)

- Added validated JSON backup selection and a preview of title, file name, component count, and connection count.
- Confirmation creates a new local canvas with a fresh ID; existing canvases are never replaced. The active canvas is flushed before switching.
- Invalid JSON/schema files, non-JSON files, and backups over 10 MB are rejected before changing saved diagrams.
- No checks were run by the coding agent. The separate testing agent should review the JSON import/recovery section in `apps/web/docs/canvas-editing-testing-checklist.md` along with the existing canvas scenarios.

## Editable connection labels and styles (2026-10-04)

- Double-click an edge label to edit it inline. The explicit Connection details panel edits relationship category, line color, solid/dashed line style, animation, label, and deletion.
- Relationship category is stored in optional edge `data.connectionKind`; edge `style` and category are preserved by the graph schema and document exporter. Edge renderer remains `archly`.
- Edge selection does not automatically open the details panel. The user confirmed backup import and prior canvas editing work; this edge editor is newly implemented.
- No checks were run. Testing agent: review the Connection label and style editing section in `apps/web/docs/canvas-editing-testing-checklist.md`, including history and JSON round trips.


## Edge presentation bug fixes (2026-10-04)

The custom edge label now follows the midpoint of the persisted route when bend points or endpoints move. Dashed lines now use a wider-spaced pattern and increased minimum line weight for clear visual contrast. Please cover the two new regression items in pps/web/docs/canvas-editing-testing-checklist.md; no checks were run by the coding agent.

## Relationship type presentation fix (2026-10-04)

The Relationship selector now applies immediate visible presets: request is blue solid, data is green dashed, and event is orange dotted. Custom resets the connection to neutral solid styling. Review category changes, marker colors, manual style overrides, undo/redo, and JSON round trips in apps/web/docs/canvas-editing-testing-checklist.md. No checks were run.
