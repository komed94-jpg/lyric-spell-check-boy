const REQUIRED = [
  'EXECUTOR_REQUEST_TOKEN',
  'EXECUTOR_EVENT_TOKEN',
  'EXECUTOR_PUBLIC_URL',
  'DATABASE_URL',
];

export function getConfig({ allowPartial = false } = {}) {
  const config = {
    requestToken: process.env.EXECUTOR_REQUEST_TOKEN,
    eventToken: process.env.EXECUTOR_EVENT_TOKEN,
    publicUrl: process.env.EXECUTOR_PUBLIC_URL,
    databaseUrl: process.env.DATABASE_URL,
    allowedTaskId: process.env.EXECUTOR_ALLOWED_TASK_ID || 'EXE-012',
    sandboxTimeoutMs: Number(process.env.SANDBOX_TIMEOUT_MS || 60_000),
  };

  if (!allowPartial) {
    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  if (!Number.isFinite(config.sandboxTimeoutMs) || config.sandboxTimeoutMs < 15_000) {
    throw new Error('SANDBOX_TIMEOUT_MS must be at least 15000');
  }

  return config;
}
