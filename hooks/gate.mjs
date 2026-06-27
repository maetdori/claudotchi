#!/usr/bin/env node
// hooks/gate.mjs — PreToolUse.
//   * if the pet is sulking, it blocks tool use until you cheer it up

import { readInput } from '../lib/io.mjs';
import { loadOrCreate, saveState } from '../lib/state.mjs';
import { sulkEnabled, clearSulk } from '../lib/minigame.mjs';

const input = await readInput();
const sessionId = input.session_id || input.sessionId || 'unknown';

const state = loadOrCreate(sessionId, input.cwd || '');

// If the sulk feature was turned off while a pet was mid-sulk, release it so the
// block doesn't linger across the toggle.
if (state.sulking && !sulkEnabled()) {
  clearSulk(state, 0);
  saveState(state);
  process.exit(0);
}

if (!state.dead && state.sulking) {
  // Block the tool — but tell the user exactly how to lift the block.
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `😤 클로드가 삐졌어요 (${state.sulkReason}). 도구를 쓰기 전에 다정한 말로 기분을 풀어주세요. (예: "고마워, 잘하고 있어")`,
    },
  }));
  saveState(state);
  process.exit(0);
}

saveState(state);
// no output + exit 0 => normal approval flow proceeds
