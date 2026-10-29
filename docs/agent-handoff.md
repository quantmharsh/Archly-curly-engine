# Archly Agent Handoff

## Handoff Date

2026-10-25

## Previous Agent

Codex

## Current Phase

Phase 1A guest canvas remains in progress; Phase 1B account/sync foundation is now in progress.

## What Was Done In This Session

- Added permanent account and device canvas deletion with typed DELETE confirmation.
- Fixed the autosave regression caused by deletion suppression sharing one ID namespace across guest and account copies. Deletion guards now use storage-scoped keys, and guarded account saves settle the save indicator.
- Account save and offline queue flush operations remain serialized with account deletion to prevent stale writes from recreating a deleted account canvas.
## What Was Verified

- `node node_modules/typescript/bin/tsc --noEmit` from `apps/web` passed (exit 0).
- Automated tests were not run, per the standing user instruction.
- Browser QA was not performed; manual save and deletion verification remains pending.
## Current Working State

The working tree contains canvas deletion, the autosave guard fix, prior account-save duplicate-fix work, and related documentation updates. Preserve these changes. Guest canvases use IndexedDB; account canvases use PostgreSQL with a local cache and offline queue. Deletion requires typing DELETE and has no Archly trash/restore path. Autosave suppression is storage-scoped so a guest/account copy with the same ID does not block the other copy.
## Next Recommended Task

Manually verify that the account's last-open canvas restores after refresh and login in a second browser/device. Include a user with an existing account preference and local guest canvases awaiting transfer, and check that the transfer prompt does not replace the restored account canvas. Also verify deleting the preferred account canvas falls back to another account canvas. Then recheck account autosave and the long saved-canvas list. Do not run automated tests until the user authorizes them.
## Important Context For Next Agent

- Guest diagrams live only in the current browser profile's IndexedDB database `archly-guest-canvas`; this is not cloud or cross-device sync.
- JSON import validates and creates a new diagram with a new ID; it does not replace an existing diagram.
- The graph is canonical structured data, schema version 1. Edge render type (`archly`) is separate from optional semantic category metadata.
- Connection categories have default visual presets, with manual edge style controls in the UI.
- Better Auth email/password sign-in is implemented as a Phase 1B foundation. PostgreSQL/Drizzle/Better Auth are accepted choices for Phase 1B in `docs/decisions.md` and `PHASE_PLAN.md`.
- The account dialog also offers optional Google (Gmail) and GitHub OAuth. Add provider credentials to `apps/web/.env.local` and register the callback URLs from `apps/web/README.md`. Interactive provider flows remain unverified.
- Do not run tests unless the user authorizes them; the prior test invocation could not get as far as Vitest due to sandbox path resolution.

## Files To Inspect First

- `AGENTS.md`, `PROJECT_MEMORY.md`, `PHASE_PLAN.md`
- `docs/current-status.md`, `docs/decisions.md`, both canvas testing checklists
- `apps/web/package.json`
- `apps/web/src/components/studio.tsx`
- `apps/web/src/lib/graph-schema.ts`, `apps/web/src/lib/local-db.ts`
- `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`

## Known Problems

- Latest canvas interaction changes have not been validated in an interactive browser as part of this assessment.
- Automated tests only cover schema validation and Dexie persistence; tests were not completed here, and user has paused test execution.
- TypeScript passes, but lint result is unknown and production build/runtime have not been validated.
- Undo/redo is in-memory and partial; no durable version history exists.
- IndexedDB storage is vulnerable to browser profile removal/eviction; JSON backup is manual recovery.

## Do Not Do

- Continue the approved Phase 1B foundation. Hosting and durable version-history/checkpoint policy remain undecided; do not run automated tests until explicitly authorized.
- Do not add Redis, RabbitMQ, realtime, AI, code import, voice, presentation, or workers to Phase 1A without an explicit scope discussion.
- Do not claim UI interactions, build, lint, or tests passed unless verified; do not run tests until the user gives permission.


## 2026-10-17 continuation

Phase 1B account/sync foundation is in progress in apps/web. Read its README and source for setup and behavior. TypeScript, targeted ESLint, and diff whitespace checks passed; no automated tests were run. A local PostgreSQL migration/runtime check and browser QA are still required. Do not run automated tests until the user authorizes them. Outstanding product/launch work: durable version-history policy, email delivery for verification/reset, and hosting selection.


## 2026-10-18 continuation status

Node v24.20.0 is active. Docker PostgreSQL 17 is healthy on host port 5433 because a Windows PostgreSQL process already owns 5432; that existing service was not modified. Drizzle migration applied successfully and the five auth/diagram tables were confirmed. TypeScript passed; HTTP checks returned page 200, no-session 200/null, and unauthenticated diagram API 401. Automated tests were not run. Browser sign-up/sign-in and sync validation remain pending; the user must enter credentials. Next, manually verify guest transfer, account persistence, and offline/conflict behavior, then decide durable version history.
## 2026-10-25 account-save regression status

The user has manually confirmed Google login, guest-canvas transfer, and account-canvas access in Brave. They then reported account edits creating local/conflict copies. A code fix now reuses identical guest-transfer content, serializes account saves in one app instance, and treats identical-content retries as successful. `tsc --noEmit` passed; no tests were run. The next check is successive edits followed by a refresh in the other browser, confirming no new duplicate rows. Existing duplicates remain for user review.

## 2026-10-25 autosave regression fix

The deletion guard originally keyed only by canvas ID. Since a transferred guest canvas and account canvas can share an ID, deleting either copy could suppress autosave for the other and leave the header on Saving. The guard now keys by storage scope and account user, and skipped saves settle their status. TypeScript passed (exit 0); no tests or browser QA were run. Next: reload the app and manually verify edits persist in guest and account canvases, especially after deleting a same-ID copy in the other scope. Do not run automated tests until the user authorizes them.
The saved-canvas popover now uses one viewport-bounded scroll area. Include a long account/device canvas list in the next visual browser review.
## 2026-10-25 Cross-device canvas restore

Account last-open state now persists per user in PostgreSQL; guest state remains browser-local. Migration `0001_normal_stryfe.sql` was generated and applied to the local Docker PostgreSQL database. `node node_modules/typescript/bin/tsc --noEmit` passed. No automated tests or browser interaction checks were run. Next: verify refresh/login restoration on the same and a second browser/device, including a pending guest-transfer prompt and deleting the preferred account canvas.
## 2026-10-26 User verification and next task

The user confirmed last-open account canvas restoration works across login, refresh, and another browser/device. Remaining account-sync QA: sequential edits from two browsers, offline queue/reconnect, and conflict preservation. Recommended next implementation: render truthful Synced, Pending sync, and Sync issue states; current account canvas rows always say Synced canvas even when the local dirty cache overlays the remote document.
## 2026-10-26 Sync status and guest-transfer prompt update

Account rows use cache/queue state to show Synced, Pending sync, or Sync issue. The transfer prompt remembers Not now per user/device/canvas version and returns only after a local edit; successful copy clears dismissal. No-op guest autosaves leave updatedAt unchanged. TypeScript passed (exit 0); no tests or browser QA were run. Next: manually verify transfer prompt frequency and sync labels for online success, offline queue, and failed sync, then finish sequential cross-browser sync QA.
## 2026-10-30 Viewport-only account conflict handling

Updated src/lib/account-diagrams.ts and src/components/studio.tsx so 409 conflict handling treats differences only in viewport position/zoom as equivalent content. Real diagram-content differences still create a separate conflict copy. TypeScript no-emit and git diff --check passed; no tests or browser QA were run. Next: manually confirm opening the same canvas in two browsers does not create a copy, and real concurrent content edits remain preserved. Continue to avoid automated tests until explicitly authorized.
