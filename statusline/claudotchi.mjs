#!/usr/bin/env node
// statusline/claudotchi.mjs — the pet's face. Runs on every status-line refresh.
//
// The status line is the only surface that knows the context % (the lifespan
// clock), so it owns: advancing the pet's FORM along the family tree as it ages,
// and recording its death when the lifespan (40%) is reached.

import { readInput, contextPct } from '../lib/io.mjs';
import { loadOrCreate, saveState } from '../lib/state.mjs';
import { advance, LIFESPAN_PCT } from '../lib/chart.mjs';
import { recordDeath } from '../lib/graveyard.mjs';
import { render } from '../lib/sprites.mjs';

const input = await readInput();
const sessionId = input.session_id || input.sessionId || 'unknown';
const project = (input.workspace && (input.workspace.current_dir || input.workspace.project_dir)) || input.cwd || '';
const pct = contextPct(input);

const state = loadOrCreate(sessionId, project);
state.lastContextPct = pct;
if (!state.bornTs) state.bornTs = Date.now();

// Age the pet: evolve its form to match its age (no-op once it matches).
// A real evolution stamps lastEvolveTs so the sprite sparkles for a few seconds.
if (!state.dead) {
  const events = advance(state, pct);
  if (events.length) state.lastEvolveTs = Date.now();
}

// Death at end of lifespan: record the tombstone exactly once.
if (!state.dead && pct >= LIFESPAN_PCT) {
  state.dead = true;
  try { recordDeath(state, 'lifespan'); } catch { /* keep rendering even if grave write fails */ }
}

saveState(state);
process.stdout.write(render(state, pct, Date.now()));
