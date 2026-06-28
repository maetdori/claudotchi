// minigame.mjs — the one surprise event we keep: 😤 sulk.
//
// The pet sulks when neglected (long idle gap) and blocks tool use until you cheer
// it up with kind words. That's the whole minigame surface now — the old ⏱️ reaction
// QTE and 🧠 surprise quiz were removed (they leaned on randomness + a realtime
// keypress channel plugins don't really have). Core growth (stat scoring from
// prompts and tools) is unaffected. Sulk is on by default; turn it off with the
// /claudotchi:sulk off command or CLAUDOTCHI_SULK=0 (the pet then never sulks
// and never blocks tool use).

import { valueOf } from './config.mjs';

// ---- 😤 sulk ---------------------------------------------------------------

// Whether the sulk minigame is active. Precedence (see config.mjs): the persisted
// slash-command toggle wins, then the CLAUDOTCHI_SULK env var, otherwise on by default.
export function sulkEnabled() {
  return valueOf('sulk');
}

export function setSulk(state, reason) {
  if (!sulkEnabled()) return;
  state.sulking = true;
  state.sulkReason = reason || '관심이 필요해요';
}

// Cheering the pet up costs nothing but kindness, and deepens the bond.
export function clearSulk(state, intensity = 1) {
  state.sulking = false;
  state.sulkReason = '';
  state.bond = (state.bond || 0) + 2 + intensity;
}
