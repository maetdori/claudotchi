// genome.mjs — heredity. This is what makes offspring a *breed*, not a *clone*.
//
// A genome is richer than the 12 visible adult forms:
//   predisposition: small innate bias to intel/dilig/clean (nudges the reachable
//                   subtree, but current-session behaviour still dominates)
//   traits:         visible, heritable looks (palette / accessory / family name)
// Two parents recombine deterministically (seeded by a hash of their ids), so the
// same pair always yields the same child, yet the mix is genuinely new each time.

import { createHash } from 'node:crypto';

export const PALETTES = ['cyan', 'green', 'magenta', 'yellow', 'blue', 'red', 'white'];
export const ACCESSORIES = ['none', 'glasses', 'bowtie', 'crown', 'headphones', 'scarf', 'flower'];
export const HOUSES = ['클로드가', '다오가', '프롬프트가', '컨텍스트가', '토큰가', '하이쿠가', '오퍼스가'];

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round1 = (x) => Math.round(x * 10) / 10;

// Deterministic byte stream from a seed string (re-hashes as it is consumed).
function makeRng(seedStr) {
  let counter = 0;
  let buf = createHash('sha256').update(`${seedStr}:0`).digest();
  let idx = 0;
  return () => {
    if (idx >= buf.length) {
      counter += 1;
      buf = createHash('sha256').update(`${seedStr}:${counter}`).digest();
      idx = 0;
    }
    return buf[idx++] / 256; // [0,1)
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

// Give even a genome-less gen-1 pet a stable look, derived from its session id.
export function deriveTraits(pet) {
  if (pet && pet.genome && pet.genome.traits) return pet.genome.traits;
  const rng = makeRng(`traits:${pet?.sessionId || 'unknown'}`);
  return {
    palette: pick(rng, PALETTES),
    accessory: pick(rng, ACCESSORIES),
    family: pick(rng, HOUSES),
  };
}

// Turn a parent's *achieved* stats (+ its own inherited bias) into a heritable
// predisposition. A parent that actually grew smart passes on a knack for it.
function parentBias(p) {
  const n = Math.max(1, p.promptCount || 0);
  const t = Math.max(1, p.toolCalls || 0);
  const achieved = {
    intel: clamp((p.intelligence || 0) / n / 2, -1.5, 1.5),
    dilig: clamp((p.diligence || 0) / n / 2, -1.5, 1.5),
    clean: clamp((p.cleanliness || 0) / t, -1.5, 1.5),
  };
  const base = (p.genome && p.genome.predisposition) || { intel: 0, dilig: 0, clean: 0 };
  return {
    intel: achieved.intel * 0.6 + (base.intel || 0) * 0.4,
    dilig: achieved.dilig * 0.6 + (base.dilig || 0) * 0.4,
    clean: achieved.clean * 0.6 + (base.clean || 0) * 0.4,
  };
}

function combineFamily(rng, famA, famB) {
  if (rng() < 0.1) return pick(rng, HOUSES); // a new house is founded (mutation)
  if (famA === famB) return famA;
  return rng() < 0.5 ? famA : famB; // dominant surname
}

// Deterministically recombine two parent pet states into a child genome.
export function recombine(parentA, parentB) {
  const seed = [parentA.sessionId, parentB.sessionId, parentA.generation || 1, parentB.generation || 1]
    .join('|');
  const rng = makeRng(seed);

  const ba = parentBias(parentA);
  const bb = parentBias(parentB);
  const mut = () => (rng() - 0.5) * 0.6; // small deterministic mutation
  const predisposition = {
    intel: round1(clamp((ba.intel + bb.intel) / 2 + mut(), -2, 2)),
    dilig: round1(clamp((ba.dilig + bb.dilig) / 2 + mut(), -2, 2)),
    clean: round1(clamp((ba.clean + bb.clean) / 2 + mut(), -2, 2)),
  };

  const ta = deriveTraits(parentA);
  const tb = deriveTraits(parentB);
  const traits = {
    palette: rng() < 0.12 ? pick(rng, PALETTES) : (rng() < 0.5 ? ta.palette : tb.palette),
    accessory: rng() < 0.12 ? pick(rng, ACCESSORIES) : (rng() < 0.5 ? ta.accessory : tb.accessory),
    family: combineFamily(rng, ta.family, tb.family),
  };

  return { predisposition, traits };
}
