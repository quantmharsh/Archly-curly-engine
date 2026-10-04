# AI Engineering Canvas - Phase Plan

Last updated: 2026-10-04
Overall status: Phase 1A guest-canvas implementation started; account sync and later phases not started.

## Tracking rules

- Update this file whenever phase scope/status changes, work is completed, a feature is added, or a design decision affects remaining work.
- Record meaningful updates in the change log below. Update `PROJECT_MEMORY.md` too when a lasting decision or core project context changes.
- A checklist item is complete only after it is implemented and checked. Link to relevant files or evidence when code exists.
- Before advancing phases, review feasibility, unresolved dependencies, and acceptance criteria with the user.

## Before Phase 1B: account and sync decisions

Status: In progress (Phase 1A is underway; remaining decisions apply to account sync and future milestones)

- [x] Review the source specification and identify the long-term product flow.
- [x] Agree to a phase-based build with feasibility checks before development.
- [x] Make documentation continuity a project requirement.
- [x] Choose a working first user and task: a software developer sketching a service flow.
- [x] Split manual canvas delivery into guest canvas (Phase 1A) followed by account persistence/sync (Phase 1B).
- [x] Confirm Phase 1A starts with guest/local persistence; Phase 1B account sync remains required before considering the manual-canvas foundation complete.
- [ ] Define how guest diagrams are imported/merged after sign-in and how sync conflicts are handled.
- [x] Start with initial canvas color controls and readable engineering-node colors; refine accessibility/readability rules as UI work proceeds.
- [x] Use one Next.js application for the guest slice; revisit a separate API only when a concrete requirement appears.
- [ ] Confirm Drizzle (or another query layer) and Better Auth (or another auth provider) before Phase 1B.
- [x] Use npm with a single app under `apps/web` for Phase 1A; decide deployment target before publishing or starting account sync.
- [x] Establish a first canonical graph schema and graph consistency validation for Phase 1A; review migration/version rules before Phase 1B.
- [ ] Decide how user edits, autosave, undo/redo, and persisted versions interact.

Phase 1A can proceed with the recorded working assumptions. Close the remaining items before starting Phase 1B account persistence.

## Proposed implementation phases

These phases preserve the specification's capabilities while keeping the first build testable and small. Phase scope is proposed; it should be confirmed before implementation starts.

### Phase 1 - Manual canvas foundation

Status: In progress (Phase 1A)

Goal: A user can create and edit a small technical diagram, keep it in the current browser, then optionally sign in and sync it across devices.

### Phase 1A - Guest canvas

Status: In progress

Goal: A guest can build a basic service flow and reopen it from the same browser profile.

Scope:

- Build a responsive technical canvas with a starter example and engineering component palette.
- Add/move/connect/select/edit/delete components and connections; support full-containment marquee selection, group dragging, copy/paste, keyboard undo/redo, inline edge-label editing, and editable connection presentation.
- Customize canvas background and component colors; save appearance with the diagram.
- Save/reopen multiple diagrams in IndexedDB, autosave, and import/export JSON backups.
- Validate saved graph structure and edge endpoints through the shared Zod schema.
- Document setup and clearly explain browser/device-scoped guest data.

Not included: login, cloud database, remote sync, multi-device guest sync, AI, repository import, Redis, RabbitMQ, and Socket.IO.

Acceptance criteria:

- A guest can create a diagram, make the supported edits, save it, reload it, and recover its graph, viewport, and appearance.
- A guest can return in the same browser profile and see local diagrams; the UI explains that data is browser/device scoped.
- Appearance choices persist per diagram and keep labels readable.
- A guest can choose a labeled connection type from the palette, click a source then destination component to add a directed arrow, and continue to connect by dragging between handles.
- The canvas is the primary workspace; left and right panels can be closed independently and reopened from canvas controls.
- A guest can rename a component by double-clicking it; selecting a component does not automatically open its inspector.
- A guest can select an arrow, add one or more bend points, and drag those points to route the arrow; bend points persist with the graph.
- A guest can double-click an arrow label to edit it inline and explicitly open Connection details to edit its relationship category, line color, solid/dashed style, and animation; these edits are undoable and persist through save, export, and import.
- A guest can expand the canvas to browser full screen, see the whole diagram, and exit with Escape.
- Invalid graph mutations are rejected with understandable errors.
- A JSON export provides a backup, and a valid backup can be previewed and imported as a new canvas without replacing existing canvases. Invalid files leave local diagrams unchanged.
- A new contributor can run the app by following the documented setup steps.

### Phase 1B - Account persistence and sync

Status: Not started

- Add account authentication and PostgreSQL-backed projects, diagrams, and versions.
- Sign in from guest mode and offer a safe import/merge flow without silently discarding local or account data.
- Sync account diagrams across supported browsers/devices.
- Define local cache/offline behavior, sync failure handling, conflict resolution, and guest-data retention/backup policy.
- Add durable version history with an agreed checkpoint policy.

Acceptance criteria: a signed-in user sees the same account diagrams across browsers/devices; guest diagrams can be transferred intentionally; conflicts or failures preserve both copies until resolved.

Still defer: Redis, RabbitMQ, Socket.IO, AI, repository import, voice, collaboration, and presentation mode.

### Phase 2 - Prompt to diagram

Status: Not started

- Generate a graph from a user prompt through a server-side AI integration.
- Validate structured output against the shared graph schema and graph consistency rules.
- Apply deterministic initial layout and handle generation/validation failures.
- Show a useful preview/diff; user explicitly approves or rejects before applying.
- Persist accepted output as a version; keep provider-specific logic behind an interface.

Acceptance criteria: generated diagrams are editable, invalid output never corrupts the current graph, and users can understand/undo what changed.

### Phase 3 - AI editing and grounded explanations

Status: Not started

- Add selected-node and current-graph context.
- Define typed, bounded operations for graph edits; validate and preview the complete proposal.
- Apply operations atomically and create an auditable version.
- Explain selected nodes using graph evidence; clearly label inference and uncertainty.
- Add conversation history only with an explicit retention/context policy.

Acceptance criteria: proposals cannot mutate UI state directly, failed proposals leave the graph unchanged, and explanations expose supporting evidence.

### Phase 4 - TypeScript/JavaScript code import

Status: Not started

- Define supported file formats, repository/file count/size limits, retention behavior, and error handling.
- Ingest source without executing it; treat archives/files as untrusted.
- Parse TypeScript/JavaScript and extract selected symbols/relations; use semantic tooling where syntax parsing is insufficient.
- Build a code graph and map diagram nodes/edges to file/symbol/line references.
- Generate a limited architecture diagram with explicit detected-versus-inferred evidence.

Acceptance criteria: users can inspect evidence behind generated relationships and see unsupported or uncertain cases instead of being shown false certainty.

### Phase 5 - Interactive understanding

Status: Not started

- Implement code/graph search, caller/callee lookup, and a carefully scoped failure-path explanation.
- Return grounded answers with source references and limitations.
- Highlight relevant nodes/edges in response to an answer.
- Add Socket.IO only if its realtime delivery model is needed for these interactions or background progress.

### Phase 6 - Voice Q&A

Status: Not started

- Add browser voice lifecycle, consent/error handling, transcript, and Vapi integration.
- Reuse the server-side grounded tools from Phase 5.
- Support voice-triggered visual highlighting; protect credentials and enforce usage limits.

### Phase 7 - Presentation mode

Status: Not started

- Define scenario paths and graph-driven presentation steps.
- Add play/pause/next/previous/restart/speed and camera focus.
- Make presentation work without voice narration; add narration only if desired.

### Phase 8 - Production hardening and scale

Status: Not started

- Add background queues, retries, dead-letter handling, idempotency, and persistent job status where measured job duration requires them.
- Add Redis for demonstrated cache/rate-limit/lock needs.
- Add tracing, metrics, AI evaluation, load/failure validation, security review, and deployment controls.
- Consider collaboration, Java/Spring, GitHub, more languages, and service extraction as separately scoped follow-on work.

## Current technology decisions

See the rationale and current official documentation references in `PROJECT_MEMORY.md`.

- In Phase 1A implementation: Next.js 16.3.8 App Router, React/TypeScript, `@xyflow/react`, Tailwind CSS, Zod, and Dexie/IndexedDB for guest mode. Zustand remains optional until shared state complexity warrants it.
- Recommended for Phase 1B, pending confirmation: PostgreSQL + Drizzle for account data and Better Auth as the auth candidate.
- Recommended development tools: TypeScript strict mode, ESLint, Vitest, Playwright, and Docker Compose for PostgreSQL if local containers are chosen.
- Conditional: Express as a separately run API, Socket.IO, Redis, and RabbitMQ; include only when a demonstrated runtime/job/caching need requires them. Redis is explicitly deferred for Phase 1.
- Later: OpenAI Agents SDK, TypeScript compiler API/ts-morph or Tree-sitter, Vapi, OpenTelemetry/Langfuse.
- Pin and re-check exact versions at implementation kickoff; do not treat this review as a compatibility test.

## Current state and next step

Initial Phase 1A app scaffold and guest-canvas UI code are in `apps/web`; dependencies are installed and `package-lock.json` is generated. The dev server starts and the home route returned HTTP 200. TypeScript type-checking passes. Vitest coverage exercises graph document validation and Dexie persistence; `npm test` runs the suite. The user completed a manual browser review of the guest canvas on 2026-10-03 and confirmed the seeded commerce diagram and canvas interactions work correctly. The workspace prioritizes the canvas, panels close independently, and component labels are edited inline by double-click. On 2026-10-04 the user confirmed the recently added multi-selection, group movement, copy/paste, and undo interactions work as expected. The user confirmed JSON backup import works on 2026-10-04. Connection-label and style editing is newly implemented and awaits the separate testing agent. No separate API service or Docker Compose configuration exists in this phase.

Next step: the separate testing agent should review `apps/web/docs/canvas-editing-testing-checklist.md` and `docs/canvas-ui-testing-checklist.md` against connection-label/style editing, JSON backup import/recovery, multi-selection, group dragging, copy/paste, undo/redo, arrow bends, full-screen mode, panels, inline renaming, and persistence. The user asked the coding agent not to run checks. After results, choose the next Phase 1A item with the user. Remaining Phase 1A gaps include overlap-free component placement and the production `next build`. Keep Phase 1B deferred until its import/conflict rules and provider choices are agreed.

## Change log

- 2026-10-04: User confirmed JSON backup import works. Added inline editing for arrow labels and an explicit Connection details panel for relationship category, line color, solid/dashed style, animation, and deletion. Persisted edge presentation/category in the graph schema and added QA scenarios. No checks were run per the user instruction.

- 2026-10-04: User confirmed the recent multi-selection, group-drag, copy/paste, and undo canvas interactions work as expected. Implemented JSON backup recovery: validated preview and explicit import as a new local canvas, preserving existing canvases and flushing the current canvas before switching. Added import scenarios to the separate testing-agent checklist. No tests or builds were run by the coding agent.

- 2026-10-02: Created `AGENTS.md`, `PROJECT_MEMORY.md`, and `PHASE_PLAN.md` after product-spec review. Recorded the accepted product direction, staged stack assessment, unresolved decisions, proposed phases, and requirement to keep these docs synchronized with code/design/feature changes.
- 2026-10-02: Added the user's UX requirements for a polished customizable canvas, browser-local guest persistence, account-backed cross-device persistence, and a safe guest-to-account migration path. Updated Phase 1 candidates and feasibility decisions; implementation remains unstarted.
- 2026-10-02: Added a concrete but unconfirmed Phase 1 stack recommendation: start with a single Next.js app, IndexedDB for guest diagrams, PostgreSQL/Drizzle and an auth provider for account diagrams. Explicitly defer Redis until measured shared-cache, rate-limit, or coordination needs; defer RabbitMQ until durable background jobs are needed.
- 2026-10-02: User asked to begin. Started Phase 1A with the working assumption of a developer sketching a service flow. Added the `apps/web` Next.js guest-canvas scaffold, initial graph validation, IndexedDB persistence layer, and UI for canvas editing/customization. Installed dependencies and generated `package-lock.json`. Account sync remains Phase 1B. The app has not been run, type-checked, visually reviewed, or tested.
- 2026-10-02: Audited the Phase 1A scaffold. Fixed persisted edge-value normalization for React Flow types, corrected React lint issues in autosave/history/component placement, removed the remaining PostCSS lint warning, and scoped Next.js Turbopack to `apps/web`. TypeScript and ESLint now pass. The dev server started and `/` returned HTTP 200. No tests, separate API, or Compose files are present; visual interaction review is still pending because the browser runtime was unavailable. Phase 1A remains in progress.
- 2026-10-02: Improved connection discoverability in the Phase 1A canvas. Added HTTPS request, data flow, and event publish templates to the build palette; selecting one guides the user to click source and destination nodes to create a labeled directed arrow. Existing drag-handle connections remain available. Updated the canvas tip and phase acceptance criteria.
- 2026-10-02: Prepared the repository for coding-agent handoff. Audited the actual app, Git state/history, and available tooling; type-check and lint pass, the existing dev server returned HTTP 200, and no test suite, API routes, or Docker/Compose configuration were found. Added current-status, handoff, and decision documents. The next task is a small Phase 1A test suite for graph validation and local persistence.
- 2026-10-03: Added Vitest and fake-indexeddb with tests for valid diagram parsing, duplicate node/edge IDs, missing edge endpoints, validated Dexie save/read round-trips, and rejection of invalid documents before persistence. Added the `npm test` script. Phase 1A remains in progress; next step is interactive visual review.
- 2026-10-03: User completed a manual browser review of the Phase 1A guest canvas and confirmed the seeded commerce diagram and canvas interactions work correctly; the outstanding interactive visual review is closed with no defects reported. Also recorded that a headless Chrome/CDP check is not a substitute for this review: it can load the server-rendered HTML without hydrating the client, which yields zero React Flow nodes and unresponsive clicks, so it must not be used to judge canvas rendering.
- 2026-10-03: Expanded the Phase 1A canvas workspace with independently closable build and settings/details panels. The right panel is closed by default and node selection no longer opens the inspector; users can open component details explicitly. Added double-click inline component-name editing and updated on-canvas guidance. TypeScript check and all 6 existing tests pass. Visual browser review could not run because no in-app browser session was available; it remains the next verification step.
- 2026-10-03: User assigned testing to another agent and asked the coding agent not to run tests. Added `docs/canvas-ui-testing-checklist.md` for panel layout, inline renaming, autosave/history, and existing canvas regression coverage; handoff now points the testing agent to that checklist.
- 2026-10-03: Added selectable edge bend controls backed by optional graph edge waypoint data, plus browser full-screen canvas mode that fits nodes and route points, restores the prior viewport on exit, and exits through Escape. Kept graph schema version 1 with optional, backward-compatible waypoint data. Updated the testing checklist for route editing, persistence, export, and full-screen exit. No tests were run per user instruction.

- 2026-10-03: Expanded Phase 1A canvas editing with full-containment marquee selection, multi-component group dragging, copy/paste of selected components and internal arrows (including bent routes), and Ctrl/Cmd+Z undo with redo shortcuts. Added `apps/web/docs/canvas-editing-testing-checklist.md` for the separate testing agent. No checks were run per the user's instruction. Next: separate testing agent reviews the checklist and reports results; then agree on the next Phase 1A task.
- 2026-10-03: Corrected the canvas navigation fix after the user reported that multi-selection, copy/paste, group movement, and keyboard undo had stopped working. Removing `selectionOnDrag` had disabled marquee selection, because React Flow computes `_selectionOnDrag = selectionOnDrag && panOnDrag !== true` and therefore ignores `selectionOnDrag` unless `panOnDrag` is not the default `true`. Restored `selectionOnDrag` and `panOnDrag={[1, 2]}` so left-drag selects exactly as before, and kept `panOnScroll` as the actual fix for the reported two-finger/trackpad scroll problem. Panning is available through two-finger scroll, Space + drag (default `panActivationKeyCode`), and middle/right mouse drag. Updated the canvas hint, quick tip, and testing checklist so they describe the real gesture set. `selectionOnDrag` combined with `panOnDrag={[1, 2]}` had restricted drag panning to the middle and right mouse buttons, and the absent `panOnScroll` meant trackpad and two-finger scroll zoomed instead of panning. Left-drag and touch panning are restored, scroll panning is enabled, and marquee selection moved to Shift + drag through `selectionKeyCode`. Updated the on-canvas hint and quick tip plus the testing checklist. Type-checking initially failed on a pre-existing error from the uncommitted waypoint edge work: `DraggableEdge` destructured `labelX`/`labelY`, which the installed React Flow v12.8.4 does not declare on `EdgeProps` and does not pass to custom edge components. Removed the dead destructuring and used the path helper's label coordinates instead, matching how React Flow's own built-in edges behave, so runtime rendering is unchanged. TypeScript and ESLint now pass; the test suite was not run because the user previously delegated testing to a separate agent.

- 2026-10-04: Fixed two reported Phase 1A edge presentation defects: custom-route labels now track the route midpoint as endpoints or bend points move, and dashed connections use a more visible dash pattern/line weight. Added both regression scenarios to the web app canvas editing testing checklist. No checks were run per the user's instruction; separate testing agent remains responsible for verification.

- 2026-10-04: Fixed relationship category presentation in Phase 1A. Category changes now apply distinct visible presets (request blue solid, data green dashed, event orange dotted), and Custom restores neutral styling. Added category switching and override scenarios to the testing-agent checklist. No checks were run; testing remains assigned to the separate agent.
