import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNextEvent,
  validateCreateRunInput,
  validateEventInput,
} from '../lib/state-machine.js';

test('only EXE-012 is accepted', () => {
  assert.equal(validateCreateRunInput({ taskId: 'EXE-012' }).taskId, 'EXE-012');
  assert.throws(() => validateCreateRunInput({ taskId: 'AG-004' }), /Only EXE-012/);
});

test('event input requires positive sequence and supported type', () => {
  const value = validateEventInput({
    runId: 'run_1', eventId: 'evt_1', sequence: 1, eventType: 'started', status: 'running',
  });
  assert.equal(value.sequence, 1);
  assert.throws(() => validateEventInput({ runId: 'r', eventId: 'e', sequence: 0, eventType: 'started' }));
  assert.throws(() => validateEventInput({ runId: 'r', eventId: 'e', sequence: 1, eventType: 'unknown' }));
});

test('strict sequence and terminal guard', () => {
  assert.deepEqual(assertNextEvent({ currentSequence: 1, currentStatus: 'running', incomingSequence: 2, eventIdAlreadyExists: false }), { duplicate: false });
  assert.throws(() => assertNextEvent({ currentSequence: 1, currentStatus: 'running', incomingSequence: 3, eventIdAlreadyExists: false }), /Out-of-order/);
  assert.throws(() => assertNextEvent({ currentSequence: 3, currentStatus: 'completed', incomingSequence: 4, eventIdAlreadyExists: false }), /terminal/);
  assert.deepEqual(assertNextEvent({ currentSequence: 3, currentStatus: 'completed', incomingSequence: 3, eventIdAlreadyExists: true }), { duplicate: true });
});
