import { getConfig } from '../../../lib/config.js';

export const runtime = 'nodejs';

export async function GET() {
  const config = getConfig({ allowPartial: true });
  const configured = Boolean(
    config.requestToken &&
      config.eventToken &&
      config.publicUrl &&
      config.supabaseUrl &&
      config.supabaseServiceRoleKey,
  );

  return Response.json({
    ok: true,
    service: 'ai-dev-agency-executor',
    version: '0.2.0',
    configured,
    mode: configured ? 'ready-for-handshake' : 'configuration-required',
    aiCallsEnabled: false,
    timestamp: new Date().toISOString(),
  });
}
