import { Sandbox } from '@vercel/sandbox';
import { getConfig } from './config.js';
import { buildHandshakeWorkerSource } from './handshake-worker-source.js';

export async function launchHandshakeSandbox(runId) {
  const config = getConfig();
  const callbackUrl = `${config.publicUrl.replace(/\/$/, '')}/api/events`;
  const sandbox = await Sandbox.create({
    runtime: 'node24',
    timeout: config.sandboxTimeoutMs,
    networkPolicy: {
      mode: 'custom',
      allowedDomains: [new URL(config.publicUrl).hostname],
      allowedCIDRs: [],
      deniedCIDRs: [],
    },
    tags: {
      service: 'ai-dev-agency-executor',
      taskId: config.allowedTaskId,
      runId,
      mode: 'handshake',
    },
  });

  const worker = buildHandshakeWorkerSource({
    runId,
    callbackUrl,
    eventToken: config.eventToken,
  });

  await sandbox.writeFiles([
    { path: 'handshake-worker.mjs', content: Buffer.from(worker) },
  ]);

  const command = await sandbox.runCommand({
    cmd: 'node',
    args: ['handshake-worker.mjs'],
    detached: true,
  });

  return {
    sandboxId: sandbox.id || sandbox.name,
    commandId: command?.id || null,
    callbackUrl,
  };
}
