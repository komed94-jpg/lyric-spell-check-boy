import { randomUUID } from 'node:crypto';
import { rpc, selectOne } from './supabase.js';

export async function createRun({ taskId, idempotencyKey, metadata }) {
  const runId = `run_${randomUUID()}`;
  const rows = await rpc('executor_create_run', {
    p_run_id: runId,
    p_task_id: taskId,
    p_idempotency_key: idempotencyKey,
    p_metadata: metadata || {},
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) throw new Error('executor_create_run returned no row');
  return row;
}

export async function appendEvent(event) {
  const rows = await rpc('executor_append_event', {
    p_run_id: event.runId,
    p_event_id: event.eventId,
    p_sequence: event.sequence,
    p_event_type: event.eventType,
    p_status: event.status,
    p_payload: event.payload || {},
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) throw new Error('executor_append_event returned no row');
  return row;
}

export async function markLaunchFailure({ runId, message }) {
  return rpc('executor_mark_launch_failure', {
    p_run_id: runId,
    p_message: String(message || 'Sandbox launch failed').slice(0, 2000),
  });
}

export async function getRun(runId) {
  return selectOne('executor_runs', { id: runId });
}
