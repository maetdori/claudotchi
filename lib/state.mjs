// state.mjs — persistence for claude-tamagotchi pet state.
//
// All pet data lives under ~/.claude/tamagotchi/ so that every Claude Code
// session on this machine shares one "ranch": each session has its own pet
// (state-<session_id>.json), and graveyard.json / pending-offspring.json are
// shared across sessions to enable a family tree and cross-session breeding.

import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs';

export const BASE_DIR = join(homedir(), '.claude', 'tamagotchi');
export const GRAVEYARD_PATH = join(BASE_DIR, 'graveyard.json');
export const PENDING_PATH = join(BASE_DIR, 'pending-offspring.json');

export function ensureDir() {
  if (!existsSync(BASE_DIR)) mkdirSync(BASE_DIR, { recursive: true });
}

export function statePath(sessionId) {
  // session ids can contain slashes/colons in theory; keep the filename safe.
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
  return join(BASE_DIR, `state-${safe}.json`);
}

export function defaultState(sessionId, project) {
  return {
    sessionId: sessionId || 'unknown',
    project: project || '',
    stage: 'egg',
    currentForm: 'egg',
    generation: 1,
    parents: [],
    genome: null, // {predisposition:{intel,dilig,clean}, traits:{palette,accessory,family}}

    // primary care stats (drive the family tree)
    intelligence: 0,
    diligence: 0,
    cleanliness: 0,
    // auxiliary stats (minigames -> hidden branches / bonuses)
    reflex: 0,
    bond: 0,

    promptCount: 0,

    lastPromptTs: 0,
    toolErrors: 0,
    toolCalls: 0,

    sulking: false,
    sulkReason: '',
    lastEventTs: 0,
    challenge: { kind: null, armed: false, t0: 0, attemptsLeft: 3 },
    quizPending: null, // {q, a, askedTs}

    lastContextPct: 0,
    dead: false,
    bornTs: 0,
  };
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

// Write atomically: write to a temp file then rename, so a half-written file
// is never observed by a concurrently-running hook / statusline.
function writeJson(path, data) {
  ensureDir();
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, path);
}

export function loadState(sessionId, project) {
  ensureDir();
  const path = statePath(sessionId);
  if (!existsSync(path)) return null;
  const s = readJson(path, null);
  if (!s) return null;
  // tolerate older/partial files by filling in any missing fields.
  return { ...defaultState(sessionId, project), ...s };
}

export function loadOrCreate(sessionId, project) {
  return loadState(sessionId, project) || defaultState(sessionId, project);
}

export function saveState(state) {
  writeJson(statePath(state.sessionId), state);
}

export function loadGraveyard() {
  return readJson(GRAVEYARD_PATH, { generations: [] });
}

export function saveGraveyard(g) {
  writeJson(GRAVEYARD_PATH, g);
}

export function loadPending() {
  return existsSync(PENDING_PATH) ? readJson(PENDING_PATH, null) : null;
}

export function savePending(p) {
  writeJson(PENDING_PATH, p);
}

export function clearPending() {
  try {
    if (existsSync(PENDING_PATH)) writeFileSync(PENDING_PATH, 'null');
  } catch { /* ignore */ }
}

// All living/dead pets across sessions — used by /breed and /family.
export function listAllPets() {
  ensureDir();
  const pets = [];
  for (const f of readdirSync(BASE_DIR)) {
    if (f.startsWith('state-') && f.endsWith('.json')) {
      const s = readJson(join(BASE_DIR, f), null);
      if (s && s.sessionId) pets.push(s);
    }
  }
  return pets;
}
