#!/usr/bin/env node
// hooks/feed.mjs — UserPromptSubmit. The prompt is the pet's food.
//   * quality of the prompt  -> 🧠 intelligence
//   * regularity (idle gap)  -> ⚡ diligence
//   * if sulking + kind words -> cheer up, ❤️ bond

import { readInput, emitAdditionalContext } from '../lib/io.mjs';
import { loadOrCreate, saveState } from '../lib/state.mjs';
import { scorePrompt, diligenceDelta, detectAffection } from '../lib/score.mjs';
import { clearSulk, setSulk } from '../lib/minigame.mjs';

const input = await readInput();
const sessionId = input.session_id || input.sessionId || 'unknown';
const prompt = input.prompt || '';
const now = Date.now();

const state = loadOrCreate(sessionId, input.cwd || '');
let note = '';

if (!state.dead) {
  // 1) cheer up a sulking pet with kind words
  if (state.sulking) {
    const aff = detectAffection(prompt);
    if (aff.affectionate) {
      clearSulk(state, aff.intensity);
      note = '💗 다정한 말에 클로드의 기분이 풀렸어요! (도구 사용 차단이 해제됩니다, ❤️유대 ↑)';
    }
  }

  // 2) feed: score quality + regularity
  const { intel } = await scorePrompt(prompt);
  const dilig = diligenceDelta(now, state.lastPromptTs);

  state.intelligence += intel;
  state.diligence += dilig;
  state.promptCount += 1;

  // a genuinely good prompt makes the pet dance for a few seconds (status line
  // picks up the window via state.actionUntil).
  if (intel >= 1.5) state.actionUntil = now + 6000;

  // long neglect upsets the pet → it sulks (the one surprise event we keep)
  if (dilig <= -1 && !state.sulking) setSulk(state, '너무 오래 혼자 뒀어요');

  state.lastPromptTs = now;
}

saveState(state);
if (note) emitAdditionalContext('UserPromptSubmit', note);
