// minigame.mjs — the one surprise event we keep: 😤 sulk.
//
// The pet sulks when neglected (long idle gap) and blocks tool use until you cheer
// it up with kind words. That's the whole minigame surface now — the old ⏱️ reaction
// QTE and 🧠 surprise quiz were removed (they leaned on randomness + a realtime
// keypress channel plugins don't really have). Core growth (stat scoring from
// prompts and tools) is unaffected. Sulk is always on; no env toggle.

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
