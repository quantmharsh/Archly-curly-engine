# AI Engineering Canvas - Project Memory

Last reviewed: 2026-10-02
Status: Design review; development has not started.

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

Potential users named in the spec: software developers, tech leads, architects, students, and interview candidates. The first target audience and initial high-value task still need to be selected.

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

## Durable decisions and open decisions

Accepted direction:

- Product concept and long-term flow in `AI_Engineering_Canvas_Project_Spec.pdf`.
- Phase-based delivery and feasibility review before broad implementation.
- Structured graph as the shared domain model.
- User requires documentation to be kept current as code, design, or features change.

Still to decide before the relevant phase:

- Initial target user and first success scenario.
- Exact MVP scope and milestone acceptance criteria.
- Graph schema details, including one canonical location for `sourceRefs`, edge animation fields, groups, and schema migrations.
- Version/checkpoint policy and the relationship between undo/redo, autosave, and persisted versions.
- Whether the first release uses Next.js route handlers or a separate Express API process.
- ORM/query layer, authentication approach, and deployment target.
- File/import limits and supported TS/JS analysis behavior.

## Source of truth

- Original product/architecture specification: `AI_Engineering_Canvas_Project_Spec.pdf`.
- Session and contribution instructions: `AGENTS.md`.
- Durable decisions and context: `PROJECT_MEMORY.md` (this file).
- Phase scope, status, acceptance criteria, remaining work, and change log: `PHASE_PLAN.md`.
- Implemented behavior: source code and tests once development begins. Documentation does not override implementation evidence.
