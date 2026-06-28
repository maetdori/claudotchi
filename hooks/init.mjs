#!/usr/bin/env node
// hooks/init.mjs — SessionStart and PreCompact.
//   SessionStart: hatch a new pet if this session has none (or its pet has died).
//                 If a bred offspring is waiting, it hatches that genome.
//   PreCompact:   the current pet's life ends (its tombstone is recorded) and a
//                 fresh egg takes over — /compact is treated as a generation gap.

import { readInput, emitAdditionalContext } from '../lib/io.mjs';
import { loadState, saveState, defaultState, loadPending, clearPending } from '../lib/state.mjs';
import { recordDeath } from '../lib/graveyard.mjs';
import { node, LIFESPAN_PCT } from '../lib/chart.mjs';
import { deriveTraits } from '../lib/genome.mjs';
import { ensureStatusline } from '../lib/install.mjs';
import { updateNotice } from '../lib/update-check.mjs';

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

// On every real session start, make sure the pet's status line is registered in
// the user's settings.json so the egg shows up without any manual setup.
let slResult = { action: 'noop' };
if (event !== 'PreCompact') slResult = ensureStatusline();

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

const parts = [];
if (hatched) {
  const n = node(hatched.currentForm);
  const traits = (hatched.genome && hatched.genome.traits) || deriveTraits(hatched);
  const lineage = hatched.parents && hatched.parents.length
    ? `${hatched.generation}대 (교배로 태어난 ${traits.family})`
    : `1대 ${traits.family}`;
  parts.push(
    `🥚 클로도치: 새 ${n.emoji} ${n.name}가 태어났어요 — ${lineage}. 좋은 프롬프트로 잘 키워주세요! (수명 = 컨텍스트 ${LIFESPAN_PCT}%)`,
  );
}
if (slResult.action === 'installed') {
  parts.push('🎀 펫 상태표시줄을 settings.json에 등록했어요 — 세션을 한 번 새로 열면 화면 하단에 알이 나타납니다.');
  parts.push('⚙️ 설정(수명·렌더·LLM 채점·삐짐)은 `/claudotchi:setup` 으로 질의하며 한 번에 고르거나, `/claudotchi:config` 로 언제든 바꿀 수 있어요.');
} else if (slResult.action === 'updated') {
  parts.push('🎀 펫 상태표시줄 경로를 settings.json에서 갱신했어요.');
} else if (slResult.action === 'skipped-existing') {
  parts.push('⚠️ 이미 사용 중인 statusLine이 있어 펫을 자동 등록하지 않았어요. `/claudotchi:statusline` 을 실행하면 **클로도치로 교체**하거나 **기존 것과 함께** 보이도록 합칠 수 있어요(수정 전 자동 백업).');
}

// A gentle "새 버전 있어요" nudge on real session starts. Daily-cached and network-
// guarded, so it costs nothing on most starts and never breaks the hook if it throws.
if (event !== 'PreCompact') {
  try {
    const notice = await updateNotice(now);
    if (notice) parts.push(notice);
  } catch { /* an update check must never break session start */ }
}

if (parts.length) emitAdditionalContext(event, parts.join('\n'));
