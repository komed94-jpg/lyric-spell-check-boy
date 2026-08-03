# AI Development Agency Executor v0.2.1 (Neon)

Owner-controlled Vercel execution service for the EXE-012 no-AI handshake.

## Current scope

- Bearer token authentication
- `POST /api/runs`
- `GET /api/runs/:runId`
- `POST /api/events`
- Neon PostgreSQL run, event, and outbox schema
- Strict idempotency and event sequencing
- Detached Vercel Sandbox handshake worker
- No AI calls

## Architecture

```text
Owner Site / test client
  -> POST /api/runs (202 + runId)
  -> Neon run record
  -> Vercel Sandbox starts independently
  -> Sandbox POSTs sequenced events to /api/events
  -> Neon updates run and creates two outbox records
  -> GET /api/runs/:runId returns durable status
```

The Vercel Function only waits long enough to launch the detached Sandbox process. It does not wait for Sandbox completion.

## Safety properties

- Only `EXE-012` is accepted.
- `Idempotency-Key` is unique.
- `event_id` is globally unique.
- Event sequence must be exactly current sequence + 1.
- Terminal runs reject later events.
- Browser clients never receive server secrets.
- AI calls are disabled in v0.2.1.

## Database

1. Create a dedicated Neon Free project named `ai-dev-agency-runtime`.
2. Copy its pooled connection string to the server-only `DATABASE_URL` variable.
3. Apply `migrations/001_executor_runtime.sql` in the Neon SQL Editor.
4. Do not use the church or Bible application databases.

## Required environment variables

Copy `.env.example` and set all secret values in Vercel project settings. Never expose `DATABASE_URL` to browser code.

## Checks

```bash
npm test
npm run check
npm run build
```

Expected handshake terminal state: `completed`, sequence `3`, AI calls `0`.
