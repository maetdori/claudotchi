#!/usr/bin/env node
// hooks/init.mjs — SessionStart and PreCompact.
//   SessionStart: hatch a new pet if this session has none (or its pet has died).
//                 If a bred offspring is waiting, it hatches that genome.
//   PreCompact:   the current pet's life ends (its tombstone is recorded) and a
//                 fresh egg takes over — /compact is treated as a generation gap.

import { readInput, emitAdditionalContext } from '../lib/io.mjs';
import { loadState, saveState, defaultState, loadPending, clearPending } from '../lib/state.mjs';
import { recordDeath } from '../lib/graveyard.mjs';
import { node } from '../lib/chart.mjs';
import { deriveTraits } from '../lib/genome.mjs';

const input = await readInput();
const event = input.hook_event_name || input.hookEventName || 'SessionStart';
const sessionId = input.session_id || input.sessionId || 'unknown';
const project = input.cwd || '';
const now = Date.now();

function hatch(sid) {
  const s = defaultState(sid, project);
  const pending = loadPending();
  if (pending && pending.genome) {
    s.genome = pending.genome;
    s.generation = pending.generation || 2;
    s.parents = pending.parents || [];
    clearPending();
  }
  s.bornTs = now;
  s.lastPromptTs = now;
  return s;
}

let hatched = null;
const existing = loadState(sessionId, project);

if (event === 'PreCompact') {
  // hand the current pet over to the graveyard, then start a fresh egg
  if (existing && !existing.dead) {
    try { recordDeath(existing, 'compact'); } catch { /* ignore */ }
  }
  hatched = hatch(sessionId);
  saveState(hatched);
} else { // SessionStart (startup / resume / clear)
  if (!existing || existing.dead) {
    hatched = hatch(sessionId);
    saveState(hatched);
  }
}

if (hatched) {
  const n = node(hatched.currentForm);
  const traits = (hatched.genome && hatched.genome.traits) || deriveTraits(hatched);
  const lineage = hatched.parents && hatched.parents.length
    ? `${hatched.generation}대 (교배로 태어난 ${traits.family})`
    : `1대 ${traits.family}`;
  emitAdditionalContext(
    event,
    `🥚 클로드 키우기: 새 ${n.emoji} ${n.name}가 태어났어요 — ${lineage}. 좋은 프롬프트로 잘 키워주세요! (수명 = 컨텍스트 40%)`,
  );
}
