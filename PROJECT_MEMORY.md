# AI Engineering Canvas - Project Memory

Last reviewed: 2026-10-03
Status: Phase 1A guest-canvas implementation started; account sync remains Phase 1B.

## How to use this file

Read this file and `PHASE_PLAN.md` before making project changes. This is the durable project context for future sessions; the PDF remains the original product specification. Keep the docs current whenever implementation, scope, architecture, or design decisions change:

- Update this file when a lasting product, architecture, technology, or workflow decision changes.
- Update `PHASE_PLAN.md` when phase scope/status changes, work is completed, new work is added, or a decision changes what remains. Add a dated change-log entry for meaningful changes.
- If code changes, update the phase checklist and record any relevant behavior, data model, endpoint, or run/setup changes. Do not claim something is done unless it exists in the workspace and has been checked.
- When a session ends, leave the current phase, completed items, remaining items, and next concrete step clear in `PHASE_PLAN.md`.

Do not rescan the entire codebase by default at session start. Use these docs to orient, then inspect only the files needed for the current task and verify doc claims against code when acting on them.

## Product idea

Build an AI-native engineering canvas for creating, understanding, modifying, and presenting software/system flows. The diagram is a structured engineering graph, not a screenshot. The same graph should eventually support manual editing, AI generation and edits, source-code analysis, grounded explanations, voice Q&A, visual highlighting, and presentation.

Core product loop from the source specification:

`Prompt -> Diagram <-> Code -> Diagram <-> Manual Edit <-> AI Edit -> Diagram -> Voice Q&A; Flow -> Animation`

Primary problem: static architecture diagrams are slow to create, disconnected from source code, and difficult to explore.

Potential users named in the spec: software developers, tech leads, architects, students, and interview candidates. The Phase 1A working audience/task is a software developer sketching a service flow; validate it with later product feedback.

## UX and persistence requirements

- The canvas should feel approachable, responsive, interactive, and visually polished. Prioritize a clear workspace and low-friction drawing/editing over a crowded toolbar.
- Keep the drawing surface primary: side panels can be closed independently. Rename a component inline by double-clicking it; selecting a component does not automatically open its inspector. Advanced component fields remain available through an explicit details control.
- Let users reshape connections by dragging persisted bend points. Full-screen mode should show only the fitted canvas and exit with Escape.
- Users should be able to customize canvas appearance, including canvas/background colors and diagram/node colors. Preserve text contrast and provide a quick way to reset to sensible defaults.
- The Phase 1A palette exposes both engineering components and labeled connection templates. A user can choose HTTPS request, data flow, or event publish, then click a source and destination node to create a directed arrow; dragging between node handles remains an alternate way to connect.
- Offer both guest/local use and signed-in account use:
  - Guest work persists in the current browser profile so it is available on later visits from that same browser/device.
  - Guest/local work is not automatically available in a different browser or device. Explain this clearly in the UI.
  - Signed-in work persists to the user's account and is available after sign-in from other supported browsers/devices.
- Provide a deliberate guest-to-account upgrade flow. When a guest signs in, offer to move or merge their local projects into the account; explain duplicates/conflicts and never silently discard either copy.
- For feasibility, treat browser storage (preferably IndexedDB for structured graph documents/history) as the guest persistence candidate and PostgreSQL-backed account storage as the cross-device source of truth. This is a proposed design to validate, not an implementation decision.
- Define behavior for offline edits, browser storage eviction/clearing, multiple local diagrams with duplicate names, sync failure, and conflicting account edits before promising these cases in the UI.

## Product and engineering principles

- Build useful vertical slices in phases; do not implement the whole vision at once.
- Keep the initial backend a modular monolith. Split services only when a demonstrated scaling or ownership boundary requires it.
- Store a validated, versioned graph as the canonical diagram representation; never make an image the only source of truth.
- AI proposes typed graph operations. Validate them, show a comprehensible preview, and let the user approve or reject before applying.
- Validate all graph mutations and ensure graph consistency. Do not let a model mutate frontend state directly.
- Keep explanations grounded in relevant graph/code evidence; label uncertain or inferred behavior.
- Never execute uploaded source code. Treat imported files as untrusted and enforce size/time limits before analysis.
- Keep the graph domain model independent of AI and voice vendors; put vendor-specific code behind interfaces.
- Every persisted diagram change is auditable through version history. The checkpoint policy (including drag/autosave behavior) still needs a product decision.
- Avoid cloning a general-purpose whiteboard; focus on technical flows and code understanding.

## Stack assessment

The proposed stack is suitable for this product, with one important qualification: adopt it as capabilities are needed, rather than making every listed service part of the first milestone.

| Area | Proposed choice | Assessment / timing |
| --- | --- | --- |
| Web | Next.js, React, TypeScript | Good fit for a polished application shell and routes. The canvas itself is client-interactive. |
| Graph canvas | `@xyflow/react` (React Flow) | Strong fit for structured nodes/edges and custom engineering node types. |
| Styling | Tailwind CSS | Suitable; keep canvas library styles ordered correctly with Tailwind per current React Flow docs. |
| UI state | Zustand | Reasonable as canvas and inspector state grows. Start with simple local state if that is enough; avoid duplicating the canonical persisted graph. |
| API | Node.js, Express, TypeScript | Good if the API is a separately deployed service and will host Socket.IO or workers. Decide whether the first milestone truly needs a separate Express process; Next route handlers are an alternative for a smaller initial deployment. |
| Validation | Zod | Good fit for runtime validation and TypeScript inference. The current OpenAI Agents SDK TypeScript docs require Zod v4; pin compatible versions when implementation begins. |
| Persistence | PostgreSQL | Good default for users/projects/diagrams/versions, with graph JSON stored as JSONB and relational ownership/version metadata. Select an ORM/query layer before implementation. |
| Realtime | Socket.IO | Useful for job progress and server-driven highlights; defer until a real event-driven journey exists. It is not required for a single-user canvas editing locally. |
| AI | OpenAI Agents SDK | Suitable for later tool-based generation/Q&A. Add only after the graph schema, operation validation, and preview/apply flow are stable. Keep graph operations vendor-neutral. |
| Parsing | TypeScript compiler API or ts-morph; Tree-sitter as needed | Start with TS/JS semantic analysis. Add Tree-sitter when broader language coverage or resilient syntax parsing is needed; syntax parsing alone does not prove runtime behavior. |
| Voice | Vapi Web SDK | Defer until text-based, grounded Q&A and the backend tools work well. |
| Redis, RabbitMQ, workers | Redis / RabbitMQ | Defer. Introduce for measured rate-limit/cache/lock or long-running job needs, not as a foundation prerequisite. |
| Observability | OpenTelemetry; Langfuse later | Add useful logs/metrics early, but defer full tracing/evaluation tooling until there are AI and background-job flows worth observing. |
| Local infrastructure | Docker Compose | Use when the selected persistent services need a repeatable local environment. Do not require containers for services the current phase does not use. |

Current official references checked on 2026-10-02:

- Next.js App Router: https://nextjs.org/docs/app
- React Flow quick start and custom nodes: https://reactflow.dev/learn and https://reactflow.dev/learn/customization/custom-nodes
- Zod basics: https://zod.dev/basics
- OpenAI Agents SDK for TypeScript: https://openai.github.io/openai-agents-js/
- Socket.IO overview: https://socket.io/docs/v4/how-it-works/

Exact package versions and deployment constraints must be checked again at implementation kickoff. This is a design assessment, not a claim that the packages have already been installed or tested together in this project.

### Recommended starting stack

Keep Phase 1 as one TypeScript web application plus PostgreSQL; do not start with the full distributed stack.

- App and API: Next.js App Router with Route Handlers for the first project/diagram/account endpoints. Add a separate Express API only when persistent WebSockets, long-running work, or deployment boundaries justify it. Next.js Route Handlers are a supported backend-for-frontend pattern, with deployment caveats for WebSockets and long-running requests.
- UI: React, TypeScript, `@xyflow/react`, Tailwind CSS, and Zustand when shared canvas state warrants it.
- Shared graph validation: Zod; keep one canonical schema and validate data at storage/API boundaries.
- Guest persistence: browser IndexedDB (a small wrapper such as Dexie is an implementation option); it is local to that browser profile/device, not cross-device sync.
- Account persistence: PostgreSQL as the authoritative cloud store for projects, diagrams, versions, and users; Drizzle ORM/migrations is the current recommendation for the TypeScript/Postgres app.
- Authentication: Better Auth is a candidate because its current docs support PostgreSQL and Drizzle; confirm the auth and deployment requirements before implementation. Never implement password/session handling by hand.
- Local development: Docker Compose for PostgreSQL only, if a local container is the chosen developer setup.
- Quality: TypeScript strict mode, ESLint, Vitest for unit/integration tests, and Playwright for browser-level flows. Use Supertest only if a separate Express server is introduced.
- Package manager/monorepo: choose at kickoff. Start as a single app unless a shared package is genuinely needed.

Implementation has started as one Next.js app in `apps/web`, using Next.js 16.3.8, React 19, React Flow, Tailwind CSS, Zod, and Dexie/IndexedDB. npm is the current package manager. Account sync remains unbuilt.

### Scaffold verification (2026-10-02, updated 2026-10-03)

- The local Next.js development server starts, and the home route returned HTTP 200. `tsc --noEmit` and ESLint pass after fixing edge serialization types and React lint findings. The TypeScript compiler updates `tsconfig.json` for the Next.js App Router on first run; keep those generated required settings.
- Vitest (with `fake-indexeddb`) now provides automated coverage for graph validation and Dexie persistence, run through the `npm test` script added in `apps/web`. There is still no separate API process and no Docker Compose/Dockerfile. A manual browser review of the guest canvas was completed by the user on 2026-10-03 and confirmed the seeded commerce diagram, node and edge rendering, and canvas interactions work correctly. A headless Chrome/CDP check is not a substitute for that review: it can load the server-rendered HTML without hydrating the client, yielding zero React Flow nodes and unresponsive clicks, so canvas rendering must be judged by a real browser session.
- `apps/web/next.config.ts` scopes Turbopack to the web app and disables Next.js nested agent-rule file generation. Guest canvas stays Phase 1A and account sync remains Phase 1B.

### Caching decision

- Do not add Redis in Phase 1. Guest persistence is browser storage; account data and version history belong in PostgreSQL. These are persistence needs, not cache needs.
- Use appropriate HTTP/Next.js caching only for cacheable, non-user-specific reads. Keep personalized diagrams and mutations correctly scoped and uncached unless a safe invalidation design exists.
- Revisit Redis when there is evidence for shared server-side cache pressure, distributed rate limiting, multi-instance coordination, or short-lived shared job/progress state. Redis remains a cache/ephemeral-state layer, never the source of truth for diagrams.
- RabbitMQ is also not required in Phase 1; add a durable queue when code analysis or other work runs long enough to need background processing, retries, and persisted job status.

Relevant official docs checked 2026-10-02:

- Next.js backend-for-frontend and Route Handlers: https://nextjs.org/docs/app/guides/backend-for-frontend
- Next.js self-hosted cache behavior: https://nextjs.org/docs/app/guides/self-hosting
- Better Auth PostgreSQL setup: https://better-auth.com/docs/adapters/postgresql
- Drizzle overview: https://orm.drizzle.team/docs/overview
- Redis caching patterns: https://redis.io/docs/latest/develop/use/patterns/

## Durable decisions and open decisions

Accepted direction:

- Product concept and long-term flow in `AI_Engineering_Canvas_Project_Spec.pdf`.
- Phase 1A guest canvas started; Phase 1B adds account sync.
- Phase-based delivery and feasibility review before broad implementation.
- Structured graph as the shared domain model.
- User requires documentation to be kept current as code, design, or features change.
- User wants a sleek, friendly, interactive canvas with customizable colors and both local guest persistence and signed-in cross-device persistence.

Still to decide before the relevant phase:

- Validate the working first target user/task (developer sketching a service flow) through later product feedback.
- Final public-release scope and acceptance criteria; Phase 1A is guest canvas, followed by Phase 1B account sync.
- Guest-to-account import/merge behavior and sync/conflict rules.
- Appearance customization scope (canvas background, theme, node/edge colors, reset/defaults, accessibility contrast).
- Graph schema details, including one canonical location for `sourceRefs`, edge animation fields, groups, and schema migrations.
- Version/checkpoint policy and the relationship between undo/redo, autosave, and persisted versions.
- Revisit a separate Express API only if a concrete requirement justifies it; Phase 1A uses one Next.js application.
- Confirm Drizzle or choose another ORM/query layer; confirm Better Auth or choose another authentication provider.
- Deployment target before public deployment.
- File/import limits and supported TS/JS analysis behavior.

## Source of truth

- Original product/architecture specification: `AI_Engineering_Canvas_Project_Spec.pdf`.
- Session and contribution instructions: `AGENTS.md`.
- Durable decisions and context: `PROJECT_MEMORY.md` (this file).
- Phase scope, status, acceptance criteria, remaining work, and change log: `PHASE_PLAN.md`.
- Implemented behavior: source code and tests once development begins. Documentation does not override implementation evidence.

## Canvas editing update (2026-10-03)

Phase 1A canvas editing now supports marquee selection of fully enclosed components, group movement, copy/paste of selected components and arrows between them (preserving and offsetting bend points), and keyboard undo/redo. Copy and paste shortcuts are ignored while an editable field has focus. The separate testing agent owns verification; see `apps/web/docs/canvas-editing-testing-checklist.md`. No test or build commands were run by the coding agent for this update. Canvas navigation: left-drag on empty canvas draws a marquee selection, and the viewport pans with two-finger or trackpad scroll, Space + drag, or a middle/right mouse drag. Ctrl/âŒ˜ + scroll zooms. An earlier attempt removed `selectionOnDrag` and therefore disabled marquee selection entirely; that was reverted. Note that React Flow only honours `selectionOnDrag` while `panOnDrag` is not the default `true`, which is why `panOnDrag={[1, 2]}` must stay paired with it.

## JSON backup import policy (2026-10-04)

Guest canvas backups use the existing JSON document format and shared Zod diagram schema. Import previews the validated title and graph counts before confirmation, then creates a new local diagram with a new ID. It never replaces an existing diagram, retains graph/view/appearance/edge-waypoint data, and saves the currently open canvas before switching. Invalid JSON/schema input and files above 10 MB are rejected before local diagrams are changed. This is a local recovery/import feature; it is not guest-to-account merge, which remains a Phase 1B decision.

## Editable connection presentation (2026-10-04)

Connection labels are edited inline by double-clicking the edge label. Relationship category (`request`, `data`, or `event`) is graph metadata separate from React Flow's renderer type (`archly`). Explicit Connection details controls label, category, stroke color, solid/dashed line style, and animation. Persist category in edge `data.connectionKind` and presentation in edge `style`; retain both in export/import and history snapshots. Selecting an edge does not automatically open its details panel.


## Edge route label and line-style correction (2026-10-04)

For edges with persisted bend points, the inline label position is derived from the route midpoint and updates with endpoint/bend movement. Dashed edge styling uses a visibly separated pattern and increased minimum stroke width so it can be distinguished from solid styling. These fixes are pending verification by the separate testing agent; see apps/web/docs/canvas-editing-testing-checklist.md.

## Relationship type presentation (2026-10-04)

Connection categories have distinct defaults: HTTPS request is blue and solid, data flow is green and dashed, and event publish is orange and dotted. Changing the category applies that category's visual preset and marker color immediately; changing to Custom restores neutral solid styling. Manual line color/style controls remain available after a preset is chosen. The separate testing agent should verify category switching and custom overrides in apps/web/docs/canvas-editing-testing-checklist.md.
