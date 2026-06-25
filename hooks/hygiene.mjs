#!/usr/bin/env node
// hooks/hygiene.mjs — PostToolUse.
//   * tool errors leave "mess" -> 🧼 cleanliness drops; clean runs nudge it up

import { readInput } from '../lib/io.mjs';
import { loadOrCreate, saveState } from '../lib/state.mjs';

function isError(resp) {
  if (!resp) return false;
  if (typeof resp === 'string') return /error|failed|exception|traceback/i.test(resp);
  if (typeof resp === 'object') {
    if (resp.is_error === true || resp.error || resp.success === false) return true;
    if (typeof resp.status === 'string' && /error|fail/i.test(resp.status)) return true;
  }
  return false;
}

const input = await readInput();
const sessionId = input.session_id || input.sessionId || 'unknown';
const resp = input.tool_response ?? input.toolResponse;

const state = loadOrCreate(sessionId, input.cwd || '');

if (!state.dead) {
  state.toolCalls += 1;
  if (isError(resp)) {
    state.cleanliness -= 1.2;
    state.toolErrors += 1;
  } else {
    state.cleanliness += 0.2;
  }
}

saveState(state);
