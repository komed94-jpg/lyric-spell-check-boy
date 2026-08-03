import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { buildHandshakeWorkerSource } from '../lib/handshake-worker-source.js';

function runNode(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, stdout, stderr }));
  });
}

test('handshake worker posts three ordered no-AI callbacks', async () => {
  const received = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.push({
      authorization: request.headers.authorization,
      body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
    });
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const callbackUrl = `http://127.0.0.1:${address.port}/api/events`;
  const dir = await mkdtemp(join(tmpdir(), 'executor-handshake-'));
  const workerPath = join(dir, 'worker.mjs');

  try {
    await writeFile(workerPath, buildHandshakeWorkerSource({
      runId: 'run_test',
      callbackUrl,
      eventToken: 'event-secret',
    }));
    const result = await runNode(workerPath);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(received.length, 3);
    assert.deepEqual(received.map((entry) => entry.body.sequence), [1, 2, 3]);
    assert.deepEqual(received.map((entry) => entry.body.eventType), ['started', 'heartbeat', 'completed']);
    assert.equal(received[2].body.status, 'completed');
    assert.equal(received[2].body.payload.aiCalls, 0);
    assert.ok(received.every((entry) => entry.authorization === 'Bearer event-secret'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
