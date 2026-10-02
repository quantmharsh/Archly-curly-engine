# Archly web app

Phase 1A guest canvas for the AI Engineering Canvas project.

## Run locally

```powershell
cd apps/web
npm install
npm run dev
```

The guest canvas saves diagrams in this browser's IndexedDB. Guest data is not synced across browsers or devices. Use **Export** to download a JSON backup. Account sign-in and cloud sync are planned for Phase 1B.

## Current slice

- Create and switch between local diagrams.
- Add, move, connect, select, edit, and delete engineering components.
- Change canvas background and component colors.
- Autosave diagram graph and appearance to browser storage.
- Export the current diagram as JSON.
- Validate saved graph structure and edge endpoint references with Zod.

AI generation, account sync, server database, Redis, queues, and realtime events are not included in this phase.
