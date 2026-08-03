import { randomUUID } from 'node:crypto';
import { getSql } from './neon.js';

export async function createRun({ taskId, idempotencyKey, metadata }) {
  const runId = `run_${randomUUID()}`;
  const sql = getSql();
  const rows = await sql`
    select * from executor_create_run(
      ${runId},
      ${taskId},
      ${idempotencyKey},
      ${JSON.stringify(metadata || {})}::jsonb
    )
  `;
  const row = rows[0];
  if (!row) throw new Error('executor_create_run returned no row');
  return row;
}

export async function appendEvent(event) {
  const sql = getSql();
  const rows = await sql`
    select * from executor_append_event(
      ${event.runId},
      ${event.eventId},
      ${event.sequence},
      ${event.eventType},
      ${event.status},
      ${JSON.stringify(event.payload || {})}::jsonb
    )
  `;
  const row = rows[0];
  if (!row) throw new Error('executor_append_event returned no row');
  return row;
}

export async function markLaunchFailure({ runId, message }) {
  const sql = getSql();
  await sql`
    select executor_mark_launch_failure(
      ${runId},
      ${String(message || 'Sandbox launch failed').slice(0, 2000)}
    )
  `;
}

export async function getRun(runId) {
  const sql = getSql();
  const rows = await sql`
    select
      id,
      task_id,
      idempotency_key,
      status,
      current_sequence,
      metadata,
      sandbox_id,
      last_error,
      created_at,
      updated_at,
      started_at,
      completed_at
    from executor_runs
    where id = ${runId}
    limit 1
  `;
  return rows[0] || null;
}
