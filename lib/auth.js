import { timingSafeEqual } from 'node:crypto';

function toBuffer(value) {
  return Buffer.from(String(value || ''), 'utf8');
}

export function safeEqual(actual, expected) {
  const left = toBuffer(actual);
  const right = toBuffer(expected);
  if (left.length !== right.length || right.length === 0) return false;
  return timingSafeEqual(left, right);
}

export function readBearerToken(request) {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] || '';
}

export function assertBearerToken(request, expected) {
  const actual = readBearerToken(request);
  if (!safeEqual(actual, expected)) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
}
