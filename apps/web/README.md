# Archly web app

Archly is an AI-native engineering canvas. The current app is a guest canvas with the first account-sync foundation in progress.

## Run locally

```powershell
cd apps/web
npm install 
Copy-Item .env.example .env.local
docker compose up -d
npm run db:migrate
npm run dev
```   

Use Node.js 24 LTS or newer. The local development database runs in Docker Compose on port 5433 and keeps its data in the named `archly-postgres-data` volume. Set a private, random `BETTER_AUTH_SECRET` in `.env.local` before using the app beyond local development. The hosting provider is intentionally undecided.

To create a migration after changing the database schema, run `npm run db:generate`, then apply it with `npm run db:migrate`.

## How account storage works

- **Better Auth** handles email/password and optional Google (Gmail) and GitHub sign-in, plus browser sessions.
- **PostgreSQL** stores account identities and account-owned canvas documents.
- **Drizzle** defines the database tables in TypeScript and manages versioned SQL migrations.
- Guest canvases continue to save in the current browser's IndexedDB. After sign-in, Archly offers to copy all unsynced local canvases to the account and retains the local originals.
- Account canvases are cached on the current device. Edits made while offline stay queued locally and sync when the connection returns. If the server has a newer revision, both edits are retained as separate canvases for review.

Email verification and password-reset email delivery are not configured yet; choose an email delivery provider before public account launch. Durable diagram version history and its checkpoint policy remain open product work.

### Social sign-in setup

Google (including Gmail accounts) and GitHub sign-in buttons are available in the account dialog. Each provider is enabled after its credentials are added to `.env.local` and the development server is restarted:

- Google: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- GitHub: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

Register the callback URL with Google and GitHub: `http://localhost:3000/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/github` for local development, then use your HTTPS application domain for production. Keep provider secrets server-side; do not prefix them with `NEXT_PUBLIC_`.

## Current slice

- Create and switch between local diagrams.
- Add, move, connect, select, edit, and delete engineering components.
- Change canvas background and component colors.
- Autosave diagram graph and appearance to browser storage.
- Export the current diagram as JSON.
- Validate saved graph structure and edge endpoint references with Zod.

AI generation, code import, Redis, queues, and realtime events are not included in this phase.
