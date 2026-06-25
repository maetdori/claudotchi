// minigame.mjs — surprise events and their scoring.
//
// Real constraint: Claude Code has no cron-style timer and no realtime keypress
// channel for plugins, so a *true* unprompted event / precise QTE is impossible.
// We approximate "불시" by rolling a low-probability die on the events we DO get
// (prompt submit, tool use), with a cooldown so it never spams.

export const EVENT_COOLDOWN_MS = 8 * 60 * 1000; // at most one surprise / 8 min
export const QUIZ_CHANCE = 0.06;
export const REACTION_CHANCE = 0.05;

// Surprise minigames (💥 quiz, ⏱️ reaction) can be turned off entirely with
// CLAUDCHI_MINIGAMES=0 (also off/false/no). Sulk-on-neglect is a care mechanic,
// not a surprise event, so it is unaffected.
export const MINIGAMES_ON = !['0', 'off', 'false', 'no'].includes(
  (process.env.CLAUDCHI_MINIGAMES || '').toLowerCase(),
);

// Surprise trigger. Randomness here is fine — it is flavour, not evaluation.
export function shouldTrigger(state, nowMs, chance) {
  if (!MINIGAMES_ON) return false;
  if (state.sulking) return false;
  if (state.challenge && state.challenge.armed) return false;
  if (state.quizPending) return false;
  if (nowMs - (state.lastEventTs || 0) < EVENT_COOLDOWN_MS) return false;
  return Math.random() < chance;
}

// ---- 😤 sulk ---------------------------------------------------------------

export function setSulk(state, reason) {
  state.sulking = true;
  state.sulkReason = reason || '관심이 필요해요';
}

// Cheering the pet up costs nothing but kindness, and deepens the bond.
export function clearSulk(state, intensity = 1) {
  state.sulking = false;
  state.sulkReason = '';
  state.bond = (state.bond || 0) + 2 + intensity;
}

// ---- ⏱️ reaction challenge -> ⭐ reflex ------------------------------------

export function armReaction(state, nowMs) {
  state.challenge = { kind: 'reaction', armed: true, t0: nowMs, attemptsLeft: 3 };
  state.lastEventTs = nowMs;
}

// Called from PostToolUse: the elapsed time since the challenge armed is a rough
// proxy for reaction speed. Coarse on purpose (execution time pollutes it).
export function scoreReaction(state, nowMs) {
  const c = state.challenge;
  if (!c || !c.armed) return null;
  const sec = (nowMs - c.t0) / 1000;
  let gained = 0;
  let label = 'miss';
  if (sec < 2) { gained = 3; label = 'PERFECT'; }
  else if (sec < 5) { gained = 2; label = 'GOOD'; }
  else if (sec < 12) { gained = 1; label = 'OK'; }

  state.reflex = (state.reflex || 0) + gained;
  c.attemptsLeft -= 1;
  if (gained > 0 || c.attemptsLeft <= 0) {
    state.challenge = { kind: null, armed: false, t0: 0, attemptsLeft: 3 };
  }
  return { gained, label, sec: Math.round(sec * 10) / 10 };
}

// ---- 🧠 quiz -> ❤️ bond + 🧠 intelligence ----------------------------------

export function setQuiz(state, quiz, nowMs) {
  state.quizPending = { q: quiz.q, keywords: quiz.keywords, askedTs: nowMs };
  state.lastEventTs = nowMs;
}

export function resolveQuiz(state, correct) {
  state.quizPending = null;
  if (correct) {
    state.bond = (state.bond || 0) + 2;
    state.intelligence = (state.intelligence || 0) + 1;
  }
}
