export function buildHandshakeWorkerSource({ runId, callbackUrl, eventToken }) {
  const config = JSON.stringify({ runId, callbackUrl, eventToken });
  return `
const config = ${config};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function send(sequence, eventType, status, payload = {}) {
  const eventId = config.runId + ':' + String(sequence).padStart(3, '0');
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(config.callbackUrl, {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + config.eventToken,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          runId: config.runId,
          eventId,
          sequence,
          eventType,
          status,
          payload: { ...payload, attempt, worker: 'sandbox-handshake-v0.2' },
        }),
      });
      if (response.ok) return;
      lastError = new Error('callback HTTP ' + response.status + ': ' + await response.text());
    } catch (error) {
      lastError = error;
    }
    await sleep(attempt * 500);
  }
  throw lastError;
}

async function main() {
  await send(1, 'started', 'running', { message: 'Sandbox handshake started' });
  await sleep(500);
  await send(2, 'heartbeat', 'running', { message: 'Sandbox handshake heartbeat' });
  await sleep(500);
  await send(3, 'completed', 'completed', { message: 'Sandbox handshake completed', aiCalls: 0 });
}

main().catch(async (error) => {
  try {
    await send(1, 'failed', 'failed', { message: String(error?.stack || error) });
  } catch {}
  process.exitCode = 1;
});
`;
}
