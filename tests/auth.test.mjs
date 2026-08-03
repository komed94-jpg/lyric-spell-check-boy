import test from 'node:test';
import assert from 'node:assert/strict';
import { readBearerToken, safeEqual } from '../lib/auth.js';

test('safeEqual accepts identical secrets', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
});

test('safeEqual rejects unequal or empty secrets', () => {
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('', ''), false);
});

test('readBearerToken parses bearer header', () => {
  const request = new Request('https://example.test', {
    headers: { authorization: 'Bearer secret-value' },
  });
  assert.equal(readBearerToken(request), 'secret-value');
});
