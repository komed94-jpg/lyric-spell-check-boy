import { neon } from '@neondatabase/serverless';
import { getConfig } from './config.js';

let sqlClient = null;

export function getSql() {
  if (!sqlClient) {
    const config = getConfig();
    sqlClient = neon(config.databaseUrl, {
      fetchOptions: { cache: 'no-store' },
    });
  }
  return sqlClient;
}
