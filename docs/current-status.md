# Archly Current Status

Last verified: 2026-10-04

## Current Phase

Phase 1A: guest canvas. Phase 1A is in progress. Phase 1B account persistence and sync have not started.

## Overall Progress

The repository contains one Next.js web app with a client-side engineering canvas. Guests can create and edit diagrams, save them to the current browser's IndexedDB, and export JSON backups. Vitest tests cover graph validation and Dexie persistence. There is no application API, account system, cloud database, or Docker setup. The app source is committed in `2a1e711`; the Vitest test files, `vitest.config.ts`, and the modified `package.json`/`package-lock.json` are uncommitted, as are `PHASE_PLAN.md`, `PROJECT_MEMORY.md`, and `docs/`. See `git status`.

## Completed

- Next.js App Router app shell and metadata: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`.
- React Flow canvas with a seeded commerce flow; service, database, API, queue, and external component types; component creation, movement, editing, deletion, and node connections: `apps/web/src/components/studio.tsx`.
- Connection palette offering HTTPS request, data flow, and event publish. Choosing a template and clicking source then destination creates a labeled directed edge. Dragging between node handles remains available. A selected arrow can have draggable bend points added to route it; waypoint coordinates are stored on the edge. Double-click an edge label to edit it inline; explicit Connection details control relationship category, line color, solid/dashed style, and animation.
- The canvas is the primary workspace; the build and right-side settings/details panels close independently. Node selection does not open the inspector; the user opens component details explicitly. Double-clicking a component starts inline name editing.
- Full-screen mode uses the canvas element as the browser fullscreen target, fits the diagram into view, hides the rest of the app, and exits with Escape.
- Canvas presets/custom color, component colors, grid toggle, diagram library, debounced autosave, in-memory undo/redo, JSON export, and validated import as a new local canvas: `apps/web/src/components/studio.tsx`, `apps/web/src/app/globals.css`.
- Version 1 Zod graph and diagram schemas, including unique node/edge IDs and edge endpoint validation: `apps/web/src/lib/graph-schema.ts`.
- Dexie/IndexedDB guest persistence using database `archly-guest-canvas` and table `diagrams`: `apps/web/src/lib/local-db.ts`.
- Local setup instructions: `apps/web/README.md`.
- Manual browser review of the guest canvas completed by the user on 2026-10-03: seeded commerce diagram, node and edge rendering, and canvas interactions confirmed working.

## Partially Implemented

- Connection editing now supports inline labels and an explicit details panel for relationship category, line color, solid/dashed style, and animation. The latest edge editor is awaiting the separate testing agent. A selected edge can also be reshaped with persisted draggable waypoint handles.
- Undo/redo is in-memory and only records selected graph operations. It is not durable version history; text, description, title, and appearance edits are not recorded as undo snapshots.
- Guest persistence is browser-profile/device scoped. JSON export exists, and validated JSON backup import creates a new canvas without replacing existing diagrams.
- The sign-in button is a placeholder that displays a Phase 1B message; there is no authentication or account sync.

## Not Implemented

- Phase 1B authentication, PostgreSQL, cloud projects/diagrams, guest import/merge, conflict resolution, and cross-device sync.
- AI prompt-to-diagram, AI editing/Q&A, repository/code import, voice, presentation mode, collaboration, or background workers.
- Redis, RabbitMQ, Socket.IO, or a separate Express/API service.
- Integration and end-to-end tests.

## Current Architecture

- **Frontend:** Next.js 16.3.8 App Router, React 19, TypeScript, `@xyflow/react`, Tailwind CSS 4.
- **Backend:** No custom backend or API routes. The Next.js server serves the app page and static assets.
- **Database:** Dexie over browser IndexedDB for guest diagrams only. No server database.
- **Redis:** Not present.
- **RabbitMQ:** Not present.
- **AI:** No AI provider or integration present.
- **Workers:** No workers or job queue present.
- **Communication:** Canvas interactions are handled in the client. No WebSocket/realtime transport is present.
- **Infrastructure:** One npm app at `apps/web`; no Dockerfile or Compose services.

## Current Data Model

Defined in `apps/web/src/lib/graph-schema.ts`:

- Diagram document: `id`, `title`, `createdAt`, `updatedAt`, and `graph`.
- Graph version 1: nodes, edges, viewport, canvas color, and grid visibility.
- Engineering node: ID, fixed `engineering` type, finite position, and data containing label, description, hex color, and one of `service`, `database`, `api`, `queue`, or `external`.
- Edge: ID, source/target node IDs, optional label/type/animation/marker metadata, and optional `data.waypoints` graph coordinates for user-shaped routes.
- Validation rejects duplicate node/edge IDs and references to missing edge endpoints.
- Persistence is a Dexie `diagrams` object store indexed by `id`, `title`, and `updatedAt`. There are no SQL tables or account models.

## Current API

No application API endpoints or route handlers exist. The only application page is `GET /`, implemented by `apps/web/src/app/page.tsx`.

## Current Frontend

The single page opens a seeded commerce-service diagram. The left sidebar has component and connection palettes plus a local diagram library. The React Flow canvas expands when either side panel is closed; the right settings/details panel is closed by default. Selecting a node does not open its inspector. Double-clicking anywhere on a component starts inline label editing; advanced description and color controls remain behind an explicit component-details toolbar action. Selecting an arrow reveals an add-bend control, and its bend handles can be dragged to reshape the route; double-clicking a bend removes it. Browser fullscreen fits nodes and route waypoints, hides the app chrome, and exits with Escape while restoring the previous viewport. Guest diagrams autosave locally and JSON export includes route waypoints.

## Current Tests

- **Unit tests:** Vitest tests in `apps/web/src/lib/graph-schema.test.ts` and `apps/web/src/lib/local-db.test.ts`.
- **Integration tests:** None found.
- **E2E tests:** None found.
- **Test command:** `npm test` (Vitest); 2 files and 6 tests passed on 2026-10-03.
- Those test results predate the draggable-arrow and fullscreen changes; the user assigned testing to another agent and requested that the coding agent not run tests.
- **Type-check:** PASS — `node node_modules/typescript/bin/tsc --noEmit` on 2026-10-03.
- **Lint:** PASS — `node node_modules/eslint/bin/eslint.js .` from `apps/web` exited 0 with no output on 2026-10-03. (An earlier note in this file reported the command stalling; that was not reproducible.)
- **Production build:** Not run during this handoff; the development server was already running and its page was checked.

## Current Infrastructure

No Dockerfile, Docker Compose file, database container, cache, queue, or server deployment configuration is present. Local development uses the `dev` script in `apps/web/package.json`. The app code/docs do not reference required environment variables; none are currently required.

## Known Issues

- Automated coverage currently includes graph validation and local diagram persistence; the latest edge editing, draggable routes, and fullscreen UI remain pending the separate testing agent's review.
- Local browser storage can be cleared or evicted. Guests can recover from an exported JSON backup; there is no cloud recovery.
- Undo/redo is not a persisted version history and does not cover every field/settings edit.
- Palette-created node positions repeat on a small deterministic grid as the node count grows and may overlap.
- Production `next build` has not been verified in this handoff.
- `git diff --check` reports no whitespace errors in tracked changes, but Git warns it will normalize line endings in `PHASE_PLAN.md` and `PROJECT_MEMORY.md` from LF to CRLF.
- The active checkout has uncommitted/untracked files. Inspect `git status --short --untracked-files=all` before making commits.
- A headless Chrome/CDP check (screenshot, DOM dump, or click probe) is not valid evidence for canvas rendering in this app: it can load the server-rendered HTML without hydrating the client, which yields zero React Flow nodes and unresponsive clicks. Use it only for HTTP status, SSR markup, static DOM structure, and console/server errors.

## Environment

No environment variables are required by the current app.

## Latest canvas editing update

Area-drag selection selects fully enclosed components; dragging a selection moves the group. Ctrl/Cmd+C and Ctrl/Cmd+V duplicate selected nodes plus arrows whose endpoints are both selected, with remapped IDs and shifted waypoint coordinates. Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes. Keyboard shortcuts do not run inside editable fields. The separate testing agent has the checklist at `apps/web/docs/canvas-editing-testing-checklist.md`; this change has not been tested by the coding agent.

## JSON backup import update (2026-10-04)

A guest can select an Archly JSON backup, inspect a validated preview, and import it as a new local canvas. Existing diagrams are not overwritten, the currently open canvas is flushed before switching, and malformed/invalid files or files above 10 MB are rejected. Imported graph, viewport, appearance, and edge waypoint data use the existing document schema. The coding agent did not run checks for this change; the import QA scenarios are in `apps/web/docs/canvas-editing-testing-checklist.md`. The user separately confirmed JSON backup import, multi-selection, group movement, copy/paste, and undo interactions work as expected; edge editing is newly implemented and not yet verified.


## 2026-10-04 edge presentation fixes

Fixed the reported connection label position issue on manually routed arrows and increased dashed-line visibility. These source changes have not been checked by the coding agent per user instruction. The testing handoff includes both regression cases.

## 2026-10-04 relationship presentation fix

Relationship categories now apply distinct line color/pattern presets, and changing the category updates the arrow presentation immediately. The separate testing agent should verify category switching and manual style overrides using the canvas editing checklist. No checks were run by the coding agent.

## 2026-10-04 canvas direct-use update

A canvas direct-use pass adds a Ctrl/⌘ K command palette, right-click context menus for components/arrows/empty canvas, double-click quick-add at the pointer, 22px grid snapping, add-at-cursor placement, category-aware handle connections, reconnectable/click-to-connect arrows, Ctrl/Cmd multi-select, Arrow-key nudge, Ctrl/Cmd+D duplicate, Shift+1 fit and Ctrl/⌘ +/- zoom, and undo coverage for component name/description/color. Connection handles are enlarged. `apps/web/src/components/studio.tsx` and `apps/web/src/app/globals.css` implement this; `apps/web/src/lib/graph-schema.ts` now accepts numeric `style.strokeDasharray`. Type-check and lint pass for the changed files and the existing tests pass; browser verification remains with the separate testing agent (scenarios added to `apps/web/docs/canvas-editing-testing-checklist.md`).
