#!/usr/bin/env node
// hooks/hygiene.mjs — PostToolUse.
//   * tool errors leave "mess" -> 🧼 cleanliness drops; clean runs nudge it up
//   * if a ⏱️ reaction challenge was armed, the elapsed time scores ⭐ reflex

import { readInput, emitAdditionalContext } from '../lib/io.mjs';
import { loadOrCreate, saveState } from '../lib/state.mjs';
import { scoreReaction } from '../lib/minigame.mjs';

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
const now = Date.now();

const state = loadOrCreate(sessionId, input.cwd || '');
let note = '';

if (!state.dead) {
  state.toolCalls += 1;
  if (isError(resp)) {
    state.cleanliness -= 1.2;
    state.toolErrors += 1;
  } else {
    state.cleanliness += 0.2;
  }

  // resolve a reaction challenge if one was armed at PreToolUse
  if (state.challenge && state.challenge.armed) {
    const r = scoreReaction(state, now);
    if (r && r.gained > 0) note = `⏱️ 반응 챌린지 ${r.label}! (${r.sec}s) ⭐순발력 +${r.gained}`;
    else if (r) note = '⏱️ 반응 챌린지 아쉽게 놓쳤어요.';
  }
}

saveState(state);
if (note) emitAdditionalContext('PostToolUse', note);
