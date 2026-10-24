# Archly Current Status

Last inspected: 2026-10-25

## Current Phase

Phase 1A: guest canvas, in progress. Phase 1B: account and sync foundation in progress.

## Overall Progress

`apps/web` is a single Next.js App Router application with a client-side React Flow canvas. Guest diagrams are stored in the current browser profile using Dexie/IndexedDB. The current committed source includes canvas editing, JSON export/import, undo/redo for selected operations, route waypoints, connection styling, and direct-use keyboard/context interactions. Phase 1B now adds Better Auth email/password sessions, PostgreSQL/Drizzle schema and migration, account-scoped diagram APIs, guest-to-account transfer, IndexedDB account cache and offline queue, and optimistic revision conflict copies.

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

- Remaining Phase 1B work: manually verify sign-up/sign-in, guest transfer, cross-device and offline sync; configure email verification/password reset delivery; define durable version-history policy; choose hosting.
- AI generation/editing/Q&A, source-code import, voice, presentation mode, collaboration, and durable version history.
- Redis, RabbitMQ, workers, Socket.IO/realtime, a separate API service, and integration/E2E test suites.

## Current Architecture

- **Frontend:** Next.js 16.3.8 App Router, React 19, TypeScript, `@xyflow/react`, Tailwind CSS 4; one app under `apps/web`.
- **Backend:** Next.js Route Handlers provide Better Auth and authenticated account diagram APIs.
- **Database:** Dexie/IndexedDB stores guest diagrams, account cache, transfer receipts, and offline sync queue; PostgreSQL with Drizzle stores users, sessions, and account diagrams.
- **Redis / RabbitMQ:** Not present.
- **AI / workers:** Not present.
- **Communication:** Client-side interactions; no WebSocket or realtime transport.
- **Infrastructure:** npm app with Drizzle migration scripts and Docker Compose for local PostgreSQL; hosting is undecided.

## Current Data Model

`apps/web/src/lib/graph-schema.ts` defines a diagram document (`id`, `title`, timestamps, `graph`) and graph schema version 1. Graph data includes engineering nodes, React Flow edges, viewport, canvas color, and grid visibility. Nodes store label, description, color, and component kind (`service`, `database`, `api`, `queue`, `external`, `decision`, `worker`, `function`). Edges can store label, renderer type, animation, marker/style data, optional `sourceHandle`/`targetHandle` (which node side the arrow attaches to), optional `data.connectionKind` (`request`, `data`, `event`), and optional `data.waypoints`. The Dexie database has a `diagrams` table indexed by `id`, `title`, and `updatedAt`; there are no SQL tables or account models.

## Current API

No application API endpoints or route handlers are present. The app page is `/` in `apps/web/src/app/page.tsx`.

## Current Frontend

The root page mounts `Studio`. It opens a seeded service diagram with component and relationship palettes, a local diagram library, expandable canvas, independently closable build/settings/details panels, and canvas toolbar. Selection, inline edits, import/export, appearance controls, full screen, context menus, command palette, and keyboard shortcuts are implemented in the client component. Email/password sign-in and account diagram sync foundation are implemented for Phase 1B; database runtime and browser QA are pending.

## Current Tests and Verification

- **Unit tests present:** two Vitest files for schema validation and local persistence. No integration or E2E tests found.
- **Typecheck:** `node node_modules/typescript/bin/tsc --noEmit` — PASS on 2026-10-05 and 2026-10-08 (exit 0).
- **Lint:** full-project `npm run lint` has no established result (the 2026-10-05 run was interrupted). ESLint run directly against the files changed on 2026-10-08 (`src/components/studio.tsx`, `src/lib/local-db.ts`) — PASS (exit 0); this is not a claim that the whole project lints clean.
- **Tests:** Not run this session, per the user instruction. Do not run automated tests until explicitly authorized.
- **Production build:** Not run in this session.
- **Runtime:** PostgreSQL container healthy; Drizzle migration applied and five expected tables confirmed. Local page returned HTTP 200, unauthenticated session returned HTTP 200 with null, protected diagrams endpoint returned HTTP 401. Interactive auth and sync remain unverified.

## Current Infrastructure

- Docker Compose runs local PostgreSQL on host port 5433 (container port 5432) because another Windows PostgreSQL process occupies 5432.
- The Drizzle migration has been applied. apps/web/.env.local contains local database/auth configuration and is ignored by Git.
## Known Issues and Limitations

- Current automated tests cover only schema and local database behavior; recent UI interactions lack verified automated/browser results in this assessment.
- Local browser storage may be cleared or evicted. Users need exported JSON backups for manual recovery.
- Undo/redo is partial, in-memory history rather than version history.
- Production build is unverified; interactive authenticated browser flows remain pending.
- Node-based npm test/build invocation hit a sandbox path-resolution `EPERM`; test execution is paused at the user's instruction.

## Environment

The app reads DATABASE_URL, BETTER_AUTH_URL, and BETTER_AUTH_SECRET from apps/web/.env.local. A root-level .env containing BETTER_AUTH_API_KEY is not used by this app.


## 2026-10-17 Phase 1B implementation update

Source now includes Better Auth, PostgreSQL/Drizzle setup, account diagram endpoints, guest transfer that retains local canvases, and offline account edit queuing with separate copies on revision conflicts. Verification completed: TypeScript no-emit, targeted ESLint, and git diff --check. Automated tests were not run. Database migration/runtime and browser QA remain unverified because Docker Desktop's database engine was unavailable. Email verification and password reset delivery, durable version history/checkpoint policy, and hosting are still open.


## 2026-10-18 local account foundation setup

Node v24.20.0 is active. PostgreSQL 17 is running through Docker Compose on host port 5433; host port 5432 is occupied by an existing Windows PostgreSQL service, which was left untouched. The Drizzle migration applied successfully and created account, diagram, session, user, and verification tables. TypeScript passed after setup. No automated tests were run. HTTP checks passed for the app page (200), unauthenticated session endpoint (200/null), and protected diagram listing (401). Interactive browser sign-up/sign-in and sync remain unverified; user must enter account credentials.

## 2026-10-18 social sign-in implementation

The account dialog includes Google (Gmail) and GitHub OAuth buttons. Better Auth only registers a provider when its server-side client ID and secret are configured in `apps/web/.env.local`; see `apps/web/README.md` and `.env.example` for variable names and callback URLs. Provider credentials and interactive OAuth flows remain unverified.
## 2026-10-24 account-save duplicate fix

The user reported that account edits created `(conflict copy)` canvases and guest transfer created a `(local copy)`. Source review found that every guest-transfer ID collision created a copy even when the account already held identical content; overlapping account autosaves could also race on one revision, and a retry after a committed write could be mistaken for a genuine conflict. The implementation now serializes account saves per signed-in user in the current app instance, treats content-identical retries as already saved, and reuses identical account content during transfer. TypeScript passed (exit 0); automated tests were not run and browser regression validation remains pending. Existing duplicate rows were not deleted.


## 2026-10-24 Canvas deletion update

The canvas library now provides delete actions for account and this-device canvases. Both require typing DELETE. Device deletion removes the local IndexedDB document; account deletion calls the authenticated hard-delete API and clears the account cache and queued sync entry. The app has no trash/restore feature. Separate copies and exported backups are independent. Account saves and queued offline sync share a per-account serialization queue with deletion to avoid recreating the record. TypeScript no-emit passed (exit 0); automated tests and browser QA were not run. Next: manually verify both deletion paths, confirmation gating, list removal, and persistence after refresh.

## 2026-10-25 Autosave deletion-guard fix

Deletion suppression is now scoped by storage source and account user, so deleting a guest or account copy does not suppress saves for a surviving same-ID copy in another scope. A skipped pending save also settles the header save state instead of leaving it at Saving. TypeScript no-emit passed (exit 0); automated tests and browser QA were not run. Reload the app and manually verify guest/account edits save, including same-ID cross-scope copies.
## 2026-10-25 Saved-canvas list overflow fix

The canvas library popover now stays within the viewport and scrolls as a whole, rather than allowing long account/device lists to overflow the popover. Automated tests and browser visual review were not run.
## 2026-10-25 Cross-device last-open canvas restore

Signed-in users' last-open account canvas is persisted in PostgreSQL via the authenticated `/api/account/last-open-diagram` route and `accountPreference` table. Guest last-open state remains browser-local. Account startup restores the server preference (with local-per-user and latest-account fallbacks) even if this device has guest canvases awaiting transfer. Deleting the preferred canvas clears the preference. The Drizzle migration was generated and applied locally; TypeScript no-emit passed. Interactive browser verification remains pending; automated tests were not run.