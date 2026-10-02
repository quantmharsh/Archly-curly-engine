# AI Engineering Canvas - Phase Plan

Last updated: 2026-10-02
Overall status: Design accepted in principle; stack looks suitable with staged adoption; implementation not started.

## Tracking rules

- Update this file whenever phase scope/status changes, work is completed, a feature is added, or a design decision affects remaining work.
- Record meaningful updates in the change log below. Update `PROJECT_MEMORY.md` too when a lasting decision or core project context changes.
- A checklist item is complete only after it is implemented and checked. Link to relevant files or evidence when code exists.
- Before advancing phases, review feasibility, unresolved dependencies, and acceptance criteria with the user.

## Before Phase 1: feasibility and product decisions

Status: In progress (design review; no implementation)

- [x] Review the source specification and identify the long-term product flow.
- [x] Agree to a phase-based build with feasibility checks before development.
- [x] Make documentation continuity a project requirement.
- [ ] Choose the first target user and the first job the product must make easier.
- [ ] Confirm MVP scope and acceptance criteria for the first usable release.
- [ ] Decide whether Next.js route handlers or a separate Express API is justified in the first release.
- [ ] Select the persistence/query layer and authentication approach before their implementation.
- [ ] Resolve canonical graph schema fields and graph consistency rules.
- [ ] Decide how user edits, autosave, undo/redo, and persisted versions interact.

Exit gate: the user confirms the first milestone scope, its acceptance criteria, and the remaining architecture choices needed to build it.

## Proposed implementation phases

These phases preserve the specification's capabilities while keeping the first build testable and small. Phase scope is proposed; it should be confirmed before implementation starts.

### Phase 1 - Manual canvas foundation

Status: Not started

Goal: A user can create and edit a small technical diagram and reliably save and reopen it.

Candidate scope:

- Create/open a project and diagram (auth can be deferred for a local/single-user MVP if the product decision allows it).
- React Flow canvas with a small, intentional set of engineering node types.
- Add, move, connect, select, edit, and delete nodes/edges; basic groups/labels only if they are needed for the first scenario.
- Shared, versioned graph schema with runtime validation and graph consistency checks.
- Persist and reload graph plus viewport; establish a clear undo/redo and save/checkpoint policy.
- Basic project/diagram/version persistence and a useful example diagram.
- Setup instructions and focused validation for core graph/API behavior.

Acceptance criteria to finalize:

- A user can create a diagram, make the supported edits, save it, reload it, and recover the same graph.
- Invalid graph mutations are rejected with understandable errors.
- Persisted history follows the agreed checkpoint policy and can be inspected/restored as designed.
- A new contributor can run the app by following the documented setup steps.

Defer unless justified: Redis, RabbitMQ, Socket.IO, AI, repository import, voice, collaboration, and presentation mode.

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

- Provisionally suitable: Next.js/React/TypeScript, `@xyflow/react`, Tailwind CSS, Zustand as state complexity grows, PostgreSQL, Zod.
- Conditional: Express as a separately run API, Socket.IO, Docker Compose; include when the selected deployment/runtime needs them.
- Later: OpenAI Agents SDK, TypeScript compiler API/ts-morph or Tree-sitter, Vapi, Redis, RabbitMQ, OpenTelemetry/Langfuse.
- Pin and re-check exact versions at implementation kickoff; do not treat this review as a compatibility test.

## Current state and next step

No source code has been created or changed in this project. The workspace contains the original specification PDF, project instructions, and these tracking documents.

Next step: complete the pre-Phase-1 decisions above, then review and confirm a small Phase 1 scope and its acceptance criteria before creating the application.

## Change log

- 2026-10-02: Created `AGENTS.md`, `PROJECT_MEMORY.md`, and `PHASE_PLAN.md` after product-spec review. Recorded the accepted product direction, staged stack assessment, unresolved decisions, proposed phases, and requirement to keep these docs synchronized with code/design/feature changes.
