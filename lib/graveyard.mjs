// graveyard.mjs — the family record. Every pet that reaches the end of its
// lifespan (context 40%) or is handed over at /compact leaves a tombstone, so a
// lineage and a family tree can be reconstructed across sessions.

import { loadGraveyard, saveGraveyard } from './state.mjs';
import { node, gradeOf } from './chart.mjs';
import { deriveTraits } from './genome.mjs';

export function recordDeath(state, cause) {
  const g = loadGraveyard();
  const entry = {
    sessionId: state.sessionId,
    generation: state.generation || 1,
    parents: state.parents || [],
    form: state.currentForm,
    name: node(state.currentForm).name,
    emoji: node(state.currentForm).emoji,
    grade: gradeOf(state.currentForm),
    stats: {
      intelligence: round1(state.intelligence),
      diligence: round1(state.diligence),
      cleanliness: round1(state.cleanliness),
      reflex: state.reflex || 0,
      bond: state.bond || 0,
    },
    genome: state.genome || { traits: deriveTraits(state) },
    project: state.project || '',
    cause: cause || 'lifespan',
    diedAtPct: round1(state.lastContextPct || 0),
  };
  g.generations = g.generations || [];
  g.generations.push(entry);
  saveGraveyard(g);
  return entry;
}

function round1(x) { return Math.round((x || 0) * 10) / 10; }

export function allTombstones() {
  return (loadGraveyard().generations) || [];
}
