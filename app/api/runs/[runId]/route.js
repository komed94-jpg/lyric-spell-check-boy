import { assertBearerToken } from '../../../../lib/auth.js';
import { getConfig } from '../../../../lib/config.js';
import { getRun } from '../../../../lib/run-store.js';

export const runtime = 'nodejs';

export async function GET(request, context) {
  try {
    const config = getConfig();
    assertBearerToken(request, config.requestToken);
    const { runId } = await context.params;
    const run = await getRun(runId);
    if (!run) {
      return Response.json({ ok: false, error: 'Run not found' }, { status: 404 });
    }
    return Response.json({ ok: true, run });
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message || 'Unexpected error' },
      { status: error.status || 500 },
    );
  }
}
