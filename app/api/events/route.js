import { assertBearerToken } from '../../../lib/auth.js';
import { getConfig } from '../../../lib/config.js';
import { appendEvent } from '../../../lib/run-store.js';
import { validateEventInput } from '../../../lib/state-machine.js';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request) {
  try {
    const config = getConfig();
    assertBearerToken(request, config.eventToken);
    const event = validateEventInput(await request.json());
    const result = await appendEvent(event);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message || 'Unexpected error' },
      { status: error.status || 400 },
    );
  }
}
