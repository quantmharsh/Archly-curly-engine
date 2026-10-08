# Archly Current Status

Last inspected: 2026-10-08

## Current Phase

Phase 1A: guest canvas, in progress. Phase 1B account persistence and sync have not started.

## Overall Progress

`apps/web` is a single Next.js App Router application with a client-side React Flow canvas. Guest diagrams are stored in the current browser profile using Dexie/IndexedDB. The current committed source includes canvas editing, JSON export/import, undo/redo for selected operations, route waypoints, connection styling, and direct-use keyboard/context interactions. There is no server API, account system, or cloud persistence.

## Completed

- App shell and home page: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`.
- Client canvas and seeded commerce graph. Supports engineering component types (`service`, `database`, `api`, `queue`, `external`, `decision`, `worker`, `function`), add/move/select/edit/delete, connection creation/reconnection, palette templates, panel toggles, inline component/edge-label editing, and explicit node/edge details panels: `apps/web/src/components/studio.tsx`.
- Four-way connections: nodes expose handles on the left, right, top, and bottom, and the canvas runs React Flow in loose connection mode so any side can start or finish a connection. The sides an arrow attaches to persist as optional `sourceHandle`/`targetHandle` edge fields: `studio.tsx`, `apps/web/src/lib/graph-schema.ts`.
- Canvas appearance (background, grid, component color), diagram library, debounced local autosave, browser fullscreen, keyboard command palette, context menus, quick-add, snapping, multi-select, group movement, nudge, duplicate, copy/paste, and keyboard undo/redo for selected operations: `studio.tsx`, `apps/web/src/app/globals.css`.
- Last-open-canvas restore: the active canvas id is stored in browser-local storage (`archly-guest-canvas:last-open-diagram` in `apps/web/src/lib/local-db.ts`) and reopened on the next visit. Switching, creating, or importing a canvas updates the pointer. Startup resolves the remembered canvas, then the most recently updated readable canvas, and only seeds the starter example when no readable canvas exists. The canvas mounts empty behind a brief "Opening your canvas…" state so the starter graph never flashes before the restored canvas renders: `studio.tsx`, `apps/web/src/app/globals.css`.
- Edge category/presentation metadata, manual color/line/animation controls, and optional editable route waypoints. Category presets are request blue/solid, data green/dashed, event orange/dotted; `Custom` restores neutral styling.
- Version 1 Zod graph/document schemas with finite node/waypoint positions, required document fields, unique node and edge IDs, and edge endpoint validation: `apps/web/src/lib/graph-schema.ts`.
- Dexie guest storage (`archly-guest-canvas`, `diagrams` store), schema validation on save/read, and diagram listing: `apps/web/src/lib/local-db.ts`.
- JSON export and validated JSON import preview. Import creates a new diagram with a fresh ID; malformed/invalid and over-10-MB files are rejected in the implementation: `studio.tsx`.
- Automated unit tests exist for graph validation and Dexie persistence: `apps/web/src/lib/graph-schema.test.ts`, `apps/web/src/lib/local-db.test.ts`.
- Setup and guest-storage scope are described in `apps/web/README.md`. QA scenarios are in `docs/canvas-ui-testing-checklist.md` and `apps/web/docs/canvas-editing-testing-checklist.md`.

## Partially Implemented

- Undo/redo is in-memory and covers selected graph operations; it is not durable version history and does not cover every title/appearance edit.
- Guest persistence is limited to one browser profile/device. JSON backup import/export provides a manual transfer path, not cloud recovery or sync.
- Latest edge editing, import edge cases, and the most recent interaction changes have QA checklist coverage, but this assessment did not execute their tests or browser review.
- Phase 1A still needs acceptance/QA follow-through. Palette placement and any other interaction edge cases should be evaluated against the QA checklists before declaring the phase complete.

## Not Implemented

- Phase 1B authentication, PostgreSQL/account data, guest-to-account import/merge, conflict resolution, and cross-device sync.
- AI generation/editing/Q&A, source-code import, voice, presentation mode, collaboration, and durable version history.
- Redis, RabbitMQ, workers, Socket.IO/realtime, a separate API service, and integration/E2E test suites.

## Current Architecture

- **Frontend:** Next.js 16.3.8 App Router, React 19, TypeScript, `@xyflow/react`, Tailwind CSS 4; one app under `apps/web`.
- **Backend:** No custom backend or route handlers. Next.js serves the app and static assets.
- **Database:** Browser IndexedDB via Dexie for guest diagrams; no server database.
- **Redis / RabbitMQ:** Not present.
- **AI / workers:** Not present.
- **Communication:** Client-side interactions; no WebSocket or realtime transport.
- **Infrastructure:** npm app with dev/build/start scripts; no Dockerfile, Compose configuration, or configured deployment services.

## Current Data Model

`apps/web/src/lib/graph-schema.ts` defines a diagram document (`id`, `title`, timestamps, `graph`) and graph schema version 1. Graph data includes engineering nodes, React Flow edges, viewport, canvas color, and grid visibility. Nodes store label, description, color, and component kind (`service`, `database`, `api`, `queue`, `external`, `decision`, `worker`, `function`). Edges can store label, renderer type, animation, marker/style data, optional `sourceHandle`/`targetHandle` (which node side the arrow attaches to), optional `data.connectionKind` (`request`, `data`, `event`), and optional `data.waypoints`. The Dexie database has a `diagrams` table indexed by `id`, `title`, and `updatedAt`; there are no SQL tables or account models.

## Current API

No application API endpoints or route handlers are present. The app page is `/` in `apps/web/src/app/page.tsx`.

## Current Frontend

The root page mounts `Studio`. It opens a seeded service diagram with component and relationship palettes, a local diagram library, expandable canvas, independently closable build/settings/details panels, and canvas toolbar. Selection, inline edits, import/export, appearance controls, full screen, context menus, command palette, and keyboard shortcuts are implemented in the client component. The sign-in control remains a Phase 1B placeholder.

## Current Tests and Verification

- **Unit tests present:** two Vitest files for schema validation and local persistence. No integration or E2E tests found.
- **Typecheck:** `node node_modules/typescript/bin/tsc --noEmit` — PASS on 2026-10-05 and 2026-10-08 (exit 0).
- **Lint:** full-project `npm run lint` has no established result (the 2026-10-05 run was interrupted). ESLint run directly against the files changed on 2026-10-08 (`src/components/studio.tsx`, `src/lib/local-db.ts`) — PASS (exit 0); this is not a claim that the whole project lints clean.
- **Tests:** Not completed. `npm test` failed before Vitest started with Node `EPERM` resolving `C:\Users\virat`; user has instructed not to run tests until further notice.
- **Production build:** Not completed. `npm run build` failed before Next.js started with the same Node `EPERM` path-resolution error.
- **Browser/runtime:** No browser session or app-start validation was performed in this assessment.

## Current Infrastructure

No Dockerfile, Docker Compose services, server database, cache, queue, or worker configuration exists. `apps/web/package.json` contains `dev`, `build`, `start`, `test`, and `lint` scripts. The code and setup README do not require environment variables.

## Known Issues and Limitations

- Current automated tests cover only schema and local database behavior; recent UI interactions lack verified automated/browser results in this assessment.
- Local browser storage may be cleared or evicted. Users need exported JSON backups for manual recovery.
- Undo/redo is partial, in-memory history rather than version history.
- No production build or runtime/browser validation was completed here.
- Node-based npm test/build invocation hit a sandbox path-resolution `EPERM`; test execution is paused at the user's instruction.

## Environment

No environment variables are required by the current app.
