# Archly Architecture Decisions

## Decision: Keep the canvas primary and make side panels optional

### Status

Accepted

### Decision

The Phase 1A canvas is the primary workspace. Build and settings/details panels can be closed independently. Selecting a component does not automatically open its inspector. Double-clicking a component edits its name inline; advanced description and color controls remain available from an explicit component-details action. Users can add and drag edge bend points to route arrows, and browser fullscreen fits the diagram and exits with Escape.

### Reason

The fixed sidebars left too little room for the canvas, and inline renaming keeps the common edit action close to the component.

### Consequences

The right panel is closed by default. Toolbar controls show or hide the panels, and component details are only shown when explicitly requested. Arrow bend points are optional graph data and remain compatible with graph schema version 1.

## Decision: Keep Phase 1A in one Next.js application

### Status

Accepted

### Decision

Build the guest canvas as one Next.js App Router application under `apps/web`. There is no separate Express API in the current phase.

### Reason

The current slice is a single-user client canvas with browser-local persistence. A separately deployed API would add infrastructure without serving a current requirement.

### Alternatives Considered

- A separate Node.js/Express API.
- Next.js route handlers when server endpoints become necessary.

### Consequences

Keep the graph and UI in the web app for Phase 1A. Revisit route handlers or a separate service only when an actual account, long-running job, or realtime requirement needs a server endpoint.

## Decision: Store guest diagrams in IndexedDB through Dexie

### Status

Accepted

### Decision

Store guest diagrams in the current browser profile using Dexie over IndexedDB. Validate diagram documents with the shared Zod schema before saving and after reading.

### Reason

The guest experience needs structured local persistence without requiring login or a server database.

### Alternatives Considered

- `localStorage`, which is less suitable for structured graph documents.
- A remote database, which requires accounts/network services and is outside Phase 1A.

### Consequences

Guest data is not cross-browser or cross-device, and browser data clearing/eviction can remove it. JSON export and validated import as a new local canvas provide manual backup and recovery. The Dexie database currently uses schema version 1; no account merge or schema migration flow is implemented.

## Decision: Validate a versioned graph as the canonical diagram

### Status

Accepted

### Decision

Represent diagrams as a versioned structured graph and validate graph shape, unique IDs, and edge endpoints with Zod. Do not make an image the source of truth.

### Reason

Manual editing and later code/AI capabilities need structured nodes and edges that can be checked and transformed.

### Alternatives Considered

- Persisting only a rendered image.
- Persisting unvalidated canvas-library state as the application model.

### Consequences

The implemented graph schema is version 1. Schema migration rules still need definition before future persisted formats evolve.

## Decision: Offer semantic connection templates in the Phase 1A palette

### Status

Accepted

### Decision

The build palette offers HTTPS request, data flow, and event publish connections. The user selects a type and then clicks source and destination nodes to create a directed labeled arrow. Dragging between handles remains an alternate connection method.

### Reason

Handle dragging alone made it difficult to discover how to create arrows and did not communicate the kinds of relationships represented by the example diagram.

### Alternatives Considered

- Only support handle dragging.
- Add one generic unlabeled connection tool.

### Consequences

Palette-created labels and animation provide defaults. Edge labels and presentation can be edited after creation; custom relationship categories beyond request, data, and event remain future work.

## Decision: Defer Redis and RabbitMQ until there is a demonstrated need

### Status

Accepted

### Decision

Do not include Redis or RabbitMQ in Phase 1A. Consider Redis for demonstrated shared cache/rate-limit/coordination needs, and a durable queue for long-running background jobs requiring retries and persisted job status.

### Reason

The current application has no server-side cache, multi-instance coordination, or background processing workload.

### Alternatives Considered

- Include both as baseline infrastructure before a backend or queue consumer exists.

### Consequences

There are no cache, queue, or worker services in the repository. Reassess only when a concrete requirement and workload exist.

## Decision: Treat PostgreSQL, Drizzle, and Better Auth as Phase 1B proposals

### Status

Proposed

### Decision

PostgreSQL with Drizzle and Better Auth are current candidates for account-backed persistence and authentication, but are not implementation commitments yet.

### Reason

Phase 1B needs durable account data and authentication, but guest-to-account import/merge, conflict rules, hosting, and exact provider choices remain unresolved.

### Alternatives Considered

- Other relational databases/query layers and authentication providers.
- Continuing with a single Next.js application using route handlers when server endpoints are added.

### Consequences

Do not add these dependencies or start account sync until the Phase 1B decisions in `PHASE_PLAN.md` are reviewed and confirmed.

## 2026-10-03: Canvas editing shortcuts and multi-selection

Phase 1A editing uses React Flow's full-containment area selection. Moving selected nodes is a group operation. Clipboard duplication includes selected nodes and only edges whose source and target are both selected; edge waypoint coordinates move with the duplicate. Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo, and clipboard/history shortcuts are disabled while typing in editable fields. Automated/browser verification is assigned to a separate agent; see `apps/web/docs/canvas-editing-testing-checklist.md`.

## 2026-10-04: Import JSON backups as new local canvases

Archly JSON backups are validated with the canonical diagram schema and shown in a preview before confirmation. Import always creates a new local diagram with a fresh ID; it does not overwrite an existing canvas. The currently open graph is saved before switching. This behavior supports guest recovery and does not define the separate Phase 1B guest-to-account merge policy.

## 2026-10-04: Keep connection metadata separate from its canvas renderer

Edge relationship category is optional graph metadata (`data.connectionKind`); the React Flow edge `type` remains the rendering choice (`archly`). Users can rename labels inline and explicitly open Connection details to edit relationship category, line color, solid/dashed stroke, and animation. Persist these fields with the graph and preserve them through undo/redo and JSON backup round trips. Edge selection alone does not open the details panel.


## 2026-10-04: Anchor labels to edited routes and clarify dashed styling

For custom-routed edges, place the label using the midpoint of the current endpoint-and-waypoint route so it moves with route edits. Make dashed styling visually distinct with a wider pattern and minimum stroke weight. Separate testing-agent verification is pending.

## 2026-10-04: Distinguish relationship categories on the canvas

Render HTTPS request as blue solid, data flow as green dashed, and event publish as orange dotted. A relationship change applies its category preset immediately; Custom restores neutral solid styling. Explicit color and line-style controls remain available for manual overrides. Distinct patterns preserve a visual distinction beyond color alone.

## 2026-10-08: Connect components from all four sides, and model component variety as node data

### Status

Accepted

### Decision

Every engineering node exposes connection handles on the left, right, top, and bottom, and the canvas runs React Flow in loose connection mode so any side can start or finish a connection; the drag direction determines which node is the source. New component kinds (decision, worker, function) are additional values of the node's `kind` data field rather than new React Flow node types or new schema type literals.

### Reason

Horizontal-only handles forced every flow into a left-to-right shape and made vertical or top-down service flows impossible to draw. Separately, adding a new node type would have changed the canonical `type: "engineering"` literal in the graph schema and required a migration for every existing document.

### Alternatives Considered

- Keeping strict connection mode and adding a separate source handle and target handle on each side (eight handles per node). Strict mode's handle resolution would have allowed a connection that starts on a target handle and ends on another target handle to produce an edge whose source handle cannot be resolved, leaving an invisible edge in the saved graph.
- A distinct React Flow node type per component shape, which would change the persisted schema's node `type` literal.

### Consequences

Connection sides are persisted as optional `sourceHandle`/`targetHandle` fields on edges; graph schema version remains 1 and older documents still validate. Because every handle is a source handle, React Flow's own fallback for an edge without a handle id would attach both ends to the right side, so the app normalises missing handles to right/left on load and on save instead of relying on handle order. Undirected "any to any" connection gestures mean a user can also create a self-referencing edge, which remains allowed. A future decision-box *shape* (rather than a kind of component card) would need its own node type and schema decision.

## 2026-10-04: Favor direct, keyboard-first canvas interactions

Reduce steps and mouse travel for common canvas work. Provide a Ctrl/⌘ K command palette, right-click context menus (component/arrow/canvas), double-click quick-add at the pointer, 22px grid snapping, add-at-cursor placement, category-aware handle connections, reconnectable and click-to-connect arrows, Ctrl/Cmd multi-select, Arrow-key nudge, Ctrl/Cmd+D duplicate, and Shift+1 fit / Ctrl/⌘ +/- zoom. Keep the existing marquee-selection and panning gestures working; selection highlighting is not document state. These interactions are client-only and do not change the persisted graph schema beyond the already-added bend points and connection category.
