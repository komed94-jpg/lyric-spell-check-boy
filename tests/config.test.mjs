import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../lib/config.js';

test('partial config exposes Neon DATABASE_URL without Supabase variables', () => {
  const original = { ...process.env };
  try {
    process.env.DATABASE_URL = 'postgresql://user:pass@example.neon.tech/neondb?sslmode=require';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const config = getConfig({ allowPartial: true });
    assert.equal(config.databaseUrl, process.env.DATABASE_URL);
    assert.equal('supabaseUrl' in config, false);
  } finally {
    process.env = original;
  }
});
