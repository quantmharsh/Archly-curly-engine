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

Guest data is not cross-browser or cross-device, and browser data clearing/eviction can remove it. JSON export exists as a manual backup. The Dexie database currently uses schema version 1; no import or migration flow is implemented.

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

Palette-created edge labels and animation are preset. Existing edge metadata cannot be edited in an inspector, and custom relationship types remain future work.

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
