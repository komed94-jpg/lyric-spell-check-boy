import { createHash } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { assertBearerToken } from '../../../lib/auth.js';
import { getConfig } from '../../../lib/config.js';
import { createRun, markLaunchFailure } from '../../../lib/run-store.js';
import { launchHandshakeSandbox } from '../../../lib/sandbox-launcher.js';
import { validateCreateRunInput } from '../../../lib/state-machine.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

function jsonError(error) {
  return Response.json(
    { ok: false, error: error.message || 'Unexpected error' },
    { status: error.status || 500 },
  );
}

function fallbackIdempotencyKey(taskId, request) {
  const fingerprint = `${taskId}:${request.headers.get('x-owner-request-id') || ''}`;
  return `auto_${createHash('sha256').update(fingerprint).digest('hex').slice(0, 32)}`;
}

export async function POST(request) {
  try {
    const config = getConfig();
    assertBearerToken(request, config.requestToken);
    const input = validateCreateRunInput(await request.json(), config.allowedTaskId);
    const idempotencyKey =
      request.headers.get('idempotency-key')?.trim() || fallbackIdempotencyKey(input.taskId, request);

    const run = await createRun({
      taskId: input.taskId,
      idempotencyKey,
      metadata: { ...input.metadata, mode: 'handshake', aiCalls: 0 },
    });

    if (!run.duplicate) {
      waitUntil(
        launchHandshakeSandbox(run.id).catch(async (error) => {
          console.error('Sandbox launch failed', { runId: run.id, message: error.message });
          await markLaunchFailure({ runId: run.id, message: error.message }).catch(console.error);
        }),
      );
    }

    return Response.json(
      {
        accepted: true,
        duplicate: Boolean(run.duplicate),
        taskId: run.task_id,
        runId: run.id,
        status: run.status,
      },
      { status: 202 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
