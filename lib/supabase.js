import { getConfig } from './config.js';

function headers(config, prefer) {
  return {
    apikey: config.supabaseServiceRoleKey,
    authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    'content-type': 'application/json',
    ...(prefer ? { prefer } : {}),
  };
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body?.message || body?.error || body?.hint || text || `HTTP ${response.status}`;
    const error = new Error(`Supabase request failed: ${message}`);
    error.status = response.status;
    error.details = body;
    throw error;
  }
  return body;
}

export async function rpc(name, args) {
  const config = getConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  return parseResponse(response);
}

export async function selectOne(table, filters, columns = '*') {
  const config = getConfig();
  const query = new URLSearchParams({ select: columns, limit: '1' });
  for (const [key, value] of Object.entries(filters)) query.set(key, `eq.${value}`);
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: headers(config),
    cache: 'no-store',
  });
  const rows = await parseResponse(response);
  return Array.isArray(rows) ? rows[0] || null : null;
}
