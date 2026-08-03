export const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);
export const EVENT_TYPES = new Set(['started', 'heartbeat', 'completed', 'failed']);

export function normalizeRunStatus(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateCreateRunInput(input, allowedTaskId = 'EXE-012') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Request body must be an object');
  }
  const taskId = String(input.taskId || '').trim();
  if (taskId !== allowedTaskId) {
    const error = new Error(`Only ${allowedTaskId} is allowed`);
    error.status = 403;
    throw error;
  }
  return {
    taskId,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
  };
}

export function validateEventInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Event body must be an object');
  }
  const runId = String(input.runId || '').trim();
  const eventId = String(input.eventId || '').trim();
  const eventType = String(input.eventType || '').trim().toLowerCase();
  const status = normalizeRunStatus(input.status || eventType);
  const sequence = Number(input.sequence);
  if (!runId || !eventId) throw new Error('runId and eventId are required');
  if (!EVENT_TYPES.has(eventType)) throw new Error(`Unsupported eventType: ${eventType}`);
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error('sequence must be a positive integer');
  return {
    runId,
    eventId,
    eventType,
    status,
    sequence,
    payload: input.payload && typeof input.payload === 'object' ? input.payload : {},
  };
}

export function assertNextEvent({ currentSequence, currentStatus, incomingSequence, eventIdAlreadyExists }) {
  if (eventIdAlreadyExists) return { duplicate: true };
  if (TERMINAL_STATUSES.has(normalizeRunStatus(currentStatus))) {
    throw new Error('Run is already terminal');
  }
  if (incomingSequence !== Number(currentSequence) + 1) {
    throw new Error(`Out-of-order event: expected ${Number(currentSequence) + 1}, received ${incomingSequence}`);
  }
  return { duplicate: false };
}
