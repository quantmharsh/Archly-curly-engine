You are preparing Archly for handoff to another AI coding agent.

Your job is NOT to implement new features.

First, inspect the entire current repository and understand the actual state of the project. Do not rely only on our conversation history.

Then create/update the following project context files:

1. docs/current-status.md
2. docs/agent-handoff.md
3. docs/decisions.md — only if architectural/product decisions have changed

IMPORTANT:
- These files must describe the ACTUAL current state of the repository.
- Do not claim something is implemented unless you verify it in the code.
- Do not invent completed work.
- Clearly distinguish implemented, partially implemented, planned, and blocked work.
- Preserve important architectural decisions.
- Include enough information for another AI agent to continue development without needing this conversation.
- Do not copy the entire conversation into these files.
- Keep the information structured and concise.
- Do not include API keys, secrets, passwords, tokens, or sensitive credentials.

==================================================
1. CURRENT PROJECT STATUS
==================================================

Update docs/current-status.md with:

# Archly Current Status

## Current Phase
State the current development phase.

## Overall Progress
Briefly describe where the project currently stands.

## Completed
List features/components that are actually implemented.

For every important item, mention relevant files/directories.

## Partially Implemented
List anything started but incomplete.

## Not Implemented
List planned functionality that does not exist yet.

## Current Architecture
Describe the actual architecture currently present in the repository.

Include:
- frontend
- backend
- database
- Redis
- RabbitMQ
- AI
- workers
- communication
- infrastructure

Only describe components that actually exist.

## Current Data Model
Describe the schemas/models/tables that currently exist.

## Current API
List important endpoints that actually exist.

## Current Frontend
Describe the current UI and major components.

## Current Tests
List:
- unit tests
- integration tests
- E2E tests
- typecheck status
- lint status

Include the actual result of running them.

## Current Infrastructure
Describe Docker/Compose/services that actually exist.

## Known Issues
List current bugs, limitations, warnings, technical debt, and incomplete areas.

## Environment
List required environment variables by NAME ONLY.
Never include secret values.

==================================================
2. AGENT HANDOFF
==================================================

Update docs/agent-handoff.md.

Use this structure:

# Archly Agent Handoff

## Handoff Date
[date]

## Previous Agent
[Codex / Claude Code / other]

## Current Phase
[phase]

## What Was Done In This Session
List the actual changes made during this session.

For each major change:
- purpose
- files/directories affected
- implementation status

## What Was Verified
Report commands actually executed.

For example:

- npm test → PASS
- npm run lint → PASS
- npm run typecheck → PASS
- docker compose up → PASS

Do NOT claim verification if it was not performed.

## Current Working State
Explain exactly what the next agent will find when opening the repository.

## Next Recommended Task
Give ONE clearly defined next task.

Do not create a huge list of unrelated tasks.

## Important Context For Next Agent
Include anything the next agent must know before modifying the code.

## Files To Inspect First
List the most relevant files/directories.

## Known Problems
List unresolved issues.

## Do Not Do
List things the next agent should avoid, based on current architecture and decisions.

==================================================
3. ARCHITECTURAL DECISIONS
==================================================

If any architectural/product decisions were made or changed, update:

docs/decisions.md

Use:

# Archly Architecture Decisions

## Decision: [title]

### Status
Accepted / Superseded / Proposed

### Decision
Describe what we decided.

### Reason
Explain why.

### Alternatives Considered
List important alternatives.

### Consequences
Explain what this decision means for future development.

IMPORTANT:
Do not rewrite old decisions unless they are actually superseded.

==================================================
4. VERIFY BEFORE HANDOFF
==================================================

Before finishing:

1. Inspect git status.
2. Inspect recent commits.
3. Inspect the relevant source files.
4. Run appropriate tests.
5. Run typecheck.
6. Run lint.
7. Verify the application starts if practical.
8. Verify Docker services if they are part of the current implementation.

If something cannot be run, explicitly say so.

==================================================
5. FINAL HANDOFF SUMMARY
==================================================

After updating the files, provide a concise summary:

- Current phase
- What is complete
- What is incomplete
- Tests/status
- Known issues
- Exact next task
- Files the next agent should inspect

Do NOT implement new features during this handoff.

The purpose of this task is to leave the repository in a clean, well-documented state so another AI coding agent can continue Archly accurately.