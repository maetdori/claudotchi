// sprites.mjs — how a pet looks in the status line.
//
// Each pet is drawn as pixel art with Unicode blocks (one "pixel" = two columns,
// so it reads roughly square) in truecolor (256-colour fallback). Every node of
// the family tree has its own silhouette, and grade == looks: the better it was
// raised, the cuter/cleaner it is; the worse, the uglier (asymmetric eyes, eye
// bags, drool/snot, stubble, body holes, muddy colour).
//
// /claudotchi:config sprite mini (or CLAUDOTCHI_SPRITE=mini) gives the old one-line
// emoji rendering (small terminals).

import { node, stageForPct, LIFESPAN_PCT } from './chart.mjs';
import { deriveTraits } from './genome.mjs';
import { valueOf } from './config.mjs';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const COLORS = {
  cyan: '\x1b[36m', green: '\x1b[32m', magenta: '\x1b[35m',
  yellow: '\x1b[33m', blue: '\x1b[34m', red: '\x1b[31m', white: '\x1b[37m',
};
function color(text, name) { return `${COLORS[name] || ''}${text}${RESET}`; }
function dim(text) { return `${DIM}${text}${RESET}`; }

const MINI = valueOf('sprite') === 'mini';

// Vertical breathing room. A braille blank (U+2800) is NOT whitespace, so unlike
// "" or a bare space it survives both the status line's per-line left-trim and the
// wrapper's `$()` trailing-newline strip — i.e. the bottom margin actually shows.
const SPACER = '⠀';
const PAD_TOP = 1;
const PAD_BOTTOM = 1;

// Animation windows (ms). The status line re-runs on each refresh, so we pick a
// frame from the wall clock. ~1fps is the ceiling — enough for a blink, a hop,
// a sparkle, not a smooth dance.
const SLEEP_MS = 5 * 60 * 1000; // idle this long → the pet dozes off
const HATCH_MS = 4000;          // egg wobbles for its first few seconds
const EVOLVE_MS = 4000;         // sparkle right after an evolution
const DANCE_MS = 6000;          // a good prompt makes it dance for a bit

// ── truecolor helpers (256-colour fallback) ───────────────────────────────────
const CT = (process.env.COLORTERM || '').toLowerCase();
const TRUECOLOR = CT.includes('truecolor') || CT.includes('24bit');
function to256(r, g, b) {
  if (r === g && g === b) {
    if (r < 8) return 16; if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const f = (x) => Math.round((x / 255) * 5);
  return 16 + 36 * f(r) + 6 * f(g) + f(b);
}
function fg(rgb) {
  const [r, g, b] = rgb;
  return TRUECOLOR ? `\x1b[38;2;${r};${g};${b}m` : `\x1b[38;5;${to256(r, g, b)}m`;
}

// detail-pixel palette (shared across forms). Exported so the 도감 generator
// (lib/dogam.mjs) can paint the same non-body pixels the status line does.
export const EYE = [31, 23, 20];
export const K = [36, 29, 24];      // dark detail: mouth / eye-bags / fangs / antenna
export const S = [150, 110, 80];    // brown: stubble / egg speckle
export const W = [174, 184, 106];   // gross yellow-green: drool / snot
export const R = [215, 80, 70];     // red nose
export const RAINBOW = [
  [230, 90, 90], [230, 170, 80], [225, 215, 90],
  [110, 200, 120], [100, 160, 230], [175, 120, 215],
];

const blk = (rgb) => `${fg(rgb)}██${RESET}`;
const glyph = (g) => `${fg(EYE)}${g}${RESET}`; // 2-char wide eye glyph

// The status line left-trims each line, which would eat the leading blank
// pixels of a sprite's empty top corners (e.g. the egg's `·OO·` rows) and shear
// the art apart. Anchor every row with a no-op reset escape: ESC is not
// whitespace, so trimStart() stops there and the leading spaces survive.
const GUARD = RESET;

function paintRow(row, body, rainbow, ri, pal) {
  const col = rainbow ? RAINBOW[ri % RAINBOW.length] : body;
  let out = GUARD;
  for (const ch of row) {
    if (ch === 'O') out += blk(col);
    else if (ch === 'k') out += blk(K);
    else if (ch === 's') out += blk(S);
    else if (ch === 'w') out += blk(W);
    else if (ch === 'r') out += blk(R);
    else if (ch === 'e') out += blk(EYE);
    else if (ch === 'u') out += glyph('--');
    else if (ch === 'x') out += glyph('xx');
    // per-sprite custom palette (e.g. 🍥 나루토치's y=금발, p=이마 보호대) — looked up
    // after the shared alphabet, so existing sprites (no `pal`) are unaffected.
    else if (pal && pal[ch]) out += blk(pal[ch]);
    else out += '  ';
  }
  return out;
}

// ── sprite + colour per node id ───────────────────────────────────────────────
const CLAY = [215, 119, 87];
const CREAM = [238, 228, 205];
const CBODY = ['·OOO·', 'OeOeO', '·OOO·'];
const TBODY = ['·OOO·', 'OeOeO', 'OOOOO', '·O·O·'];
const ctop = (t) => [t, ...CBODY];
const ttop = (t) => [t, ...TBODY];

export const SPRITES = {
  egg:   { body: CREAM, grid: ['·OO·', 'OsOO', 'OOsO', '·OO·'] },
  alklo: { body: CLAY,  grid: ['·OO·', 'OeeO', '·OO·'] },

  ddolttol:   { body: CLAY, grid: ctop('··k··') },
  pyeongbeom: { body: CLAY, grid: CBODY },
  malsseong:  { body: CLAY, grid: ctop('O···O') },

  busy_model:        { body: CLAY, grid: ttop('·kkk·') },
  relaxed_genius:    { body: CLAY, grid: ttop('···O·') },
  diligent_avg:      { body: CLAY, grid: ttop('··O··') },
  relaxed_avg:       { body: CLAY, grid: ttop('·O···') },
  busy_trouble:      { body: CLAY, grid: ttop('O·O·O') },
  neglected_trouble: { body: CLAY, grid: ['·····', '·OOO·', 'OuOuO', 'OOOOO', '·O·O·'] },

  // adults — cute (top) → ugly (bottom)
  master:          { body: [232, 192, 92], grid: ['O·O·O·O', '·OOOOO·', 'OeOOOeO', 'OOOOOOO', 'OO·k·OO', '·O···O·'] },
  nerd:            { body: [90, 185, 175],  grid: ['···k···', '·OOOOO·', 'OeeOeeO', 'OOOOOOO', 'OO·k·OO', '·O···O·'] },
  pro:             { body: [92, 150, 225],  grid: ['·OOOOO·', 'OOOOOOO', 'OkOOOkO', 'OOOOOOO', 'OO·k·OO', '·O···O·'] },
  model_citizen:   { body: [120, 195, 120], grid: ['··OOO··', '·OOOOO·', 'OeOOOeO', 'OOOOOOO', 'OO·k·OO', '·O···O·'] },
  basement_genius: { body: [150, 120, 195], grid: ['OO·O·OO', '·OOOOO·', 'OeOOOeO', 'OkO·OkO', 'OOO·OOO', '·O···O·'] },
  glutton:         { body: [207, 138, 114], grid: ['·OOOOO·', 'OOOOOOO', 'OeOOOeO', 'OOOOOOO', 'OkwwwkO', '·O···O·'] },
  mypace:          { body: [169, 154, 176], grid: ['O·····O', 'OO···OO', '·OOOOO·', 'OuOOOuO', 'OO·k·OO', '·O···O·'] },
  lazy:            { body: [155, 155, 155], grid: ['··OOO··', '·OOOOO·', 'OuOOOuO', 'OkOOOkO', 'OO·w·OO', '·O···O·'] },
  clown:           { body: [176, 102, 153], grid: ['··OkO··', '·OOOOO·', 'Oe·O·eO', 'OOOrOOO', 'Ok·kkO·', '·O···O·'] },
  berserk:         { body: [194, 72, 63],   grid: ['O·····O', 'OO·O·OO', 'OkOOOkO', 'OOOOOOO', 'OkkOkkO', '·O··O··'] },
  zombie:          { body: [138, 154, 95],  grid: ['·OOOO··', 'OOOOOOO', 'OxOOOxO', 'OO·OOOO', 'Ok·w·kO', '·O···O·'] },
  oyaji:           { body: [138, 117, 96],  grid: ['O·····O', '·OOOOO·', 'OuOOOuO', 'OkOOOkO', 'OsssssO', '·O···O·'] },
  legend:          { body: [232, 205, 120], badge: '🌟', rainbow: true, grid: ['·k·k·k·', '·OOOOO·', 'OeOOOeO', 'OOOOOOO', 'OO·k·OO', '·O···O·'] },
  // 🐱 hidden cat: pointy ears, whiskers (k at the rim), a tiny k nose.
  nyang:           { body: [234, 178, 104], badge: '🐾', grid: ['OO···OO', '·OOOOO·', 'OeOOOeO', 'kOOkOOk', '·OOOOO·', '·O···O·'] },
  // 🍥 hidden ninja (나루토치): blond spikes (y) over a forehead protector plate (p),
  // orange body. Uses per-sprite `pal` for the two colours outside the shared alphabet.
  narutochi:       { body: [232, 138, 40], badge: '🍥', pal: { y: [240, 206, 72], p: [188, 192, 197] },
                     grid: ['y·y·y·y', 'yyyyyyy', 'kkpppkk', 'OeOOOeO', 'kOOOOOk', 'kOO·OOk', '·OOOOO·'] },
};
const STAGE_FALLBACK = { egg: 'egg', baby: 'alklo', child: 'pyeongbeom', teen: 'diligent_avg', adult: 'model_citizen' };

const STAGE_LABEL = {
  egg: '알', baby: '유아기', child: '성장기', teen: '청년기', adult: '성체', dead: '죽음',
};

const GOLD = [232, 193, 92]; // web mockup's --accent — the life-bar fill colour
function lifeBar(pct) {
  const width = 12;
  const ratio = Math.max(0, Math.min(1, pct / LIFESPAN_PCT));
  const filled = Math.round(ratio * width);
  // gold fill over a dim empty track (like the web mockup), so the lifespan ratio
  // pops at a glance instead of blending into the rest of the dim text.
  const bar = `${fg(GOLD)}${'█'.repeat(filled)}${RESET}${DIM}${'░'.repeat(width - filled)}${RESET}`;
  return `${bar}  ${dim(`${Math.round(pct)}% / ${LIFESPAN_PCT}%`)}`;
}

// labelled stat line — each icon spelled out, so it's clear what every score
// means. ⚡ needs an explicit emoji variation selector (U+FE0F); without it some
// terminals fall back to the narrow text glyph and it looks smaller than the rest.
function statSummary(state) {
  const r = (x) => Math.round(x || 0);
  return dim(`🧠 지능 ${r(state.intelligence)}   ⚡️ 성실 ${r(state.diligence)}   🧼 청결 ${r(state.cleanliness)}   ❤️ 교감 ${r(state.bond)}`);
}

// 이름 · 가문 · 세대 — all on one compact line under the sprite. The name keeps the
// body colour; the 🏠 가문/세대 trail (and the grade, for adults) is dim. Left-aligned
// like the stat line below it — GUARD stops the per-line left-trim from eating a
// leading space. The animation note (💤/🎵/✨) hangs off the right.
function idLine(state, bodyRgb, note) {
  const n = node(state.currentForm);
  const spec = SPRITES[state.currentForm] || {};
  const badge = spec.badge ? spec.badge + ' ' : '';
  const mood = state.sulking ? ' 😤' : '';
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const gen = state.generation || 1;
  const grade = n.grade ? ` · ${n.grade}급` : '';
  const name = `${fg(bodyRgb)}${n.name}${RESET}`;
  return `${GUARD}${badge}${name}${mood} ${dim(`· 🏠 ${traits.family} · ${gen}세대${grade}`)}${note}`;
}

function eventLine(state) {
  // The only surprise event left: 😤 sulk. It shows whenever the pet is upset.
  if (state.sulking) return color(`😤 삐졌어요: ${state.sulkReason}. 다정하게 말을 걸어 풀어주세요.`, 'magenta');
  return null;
}

function creatureLine(state) {
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const gen = state.generation || 1;
  const mood = state.sulking ? ' 😤삐짐' : '';
  return `${n.emoji} ${n.name}${mood} ${dim(`· ${traits.family} ${gen}세대`)}`;
}

function renderDead(state) {
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const grade = n.grade || '-';
  const head = `🪦 RIP ${n.name} · ${grade}급 · ${state.generation || 1}세대 (${traits.family})`;
  const hint = '수명이 다했어요. /compact 하거나 새 세션을 열면 다음 세대가 태어납니다. /claudotchi:breed 로 교배도 가능.';
  if (MINI) return [color(head, 'red'), dim(hint)].join('\n');
  const grave = ['  ____  ', ' /    \\ ', ' | RIP| ', '_|____|_'].map((r) => dim(r));
  return [...grave, color(head, 'red'), dim(hint)].join('\n');
}

function renderMini(state, pct) {
  if (state.dead || pct >= LIFESPAN_PCT) return renderDead(state);
  const lines = [creatureLine(state)];
  lines.push(`${lifeBar(pct)}  ${dim(STAGE_LABEL[stageForPct(pct)] || '')}`);
  lines.push(statSummary(state));
  const ev = eventLine(state); if (ev) lines.push(ev);
  return lines.join('\n');
}

// ── animation ─────────────────────────────────────────────────────────────────
// Frames are chosen from the wall clock, so each status-line refresh shows the
// right one. Returns a (possibly mutated) grid + a short glyph to append to the
// name (💤 / 🎵 / ✨). Low-fps by nature: a blink, a hop, a sparkle — not a dance.
const closeEyes = (grid) => grid.map((r) => r.replace(/e/g, 'u')); // open → sleepy

// Returns { grid, note, shift }. `shift` is a whole-pixel horizontal offset that
// render() applies to BOTH the sprite and its name, so they move as one unit.
function animate(grid, state, nowMs, stage) {
  // 🥚 hatching: the fresh egg wobbles, then a crack shows, for its first seconds.
  if (stage === 'egg' && state.bornTs && nowMs - state.bornTs < HATCH_MS) {
    const t = nowMs - state.bornTs;
    const g = t > HATCH_MS * 0.5 ? ['·OO·', 'OkOO', 'OOkO', '·OO·'] : grid; // crack
    const shift = Math.floor(nowMs / 250) % 2;                              // wobble
    return { grid: g, note: t > HATCH_MS * 0.75 ? ' ✨' : '', shift };
  }

  // 💤 asleep: left idle for a long while → eyes shut, no fidget.
  if (state.lastPromptTs && nowMs - state.lastPromptTs > SLEEP_MS && nowMs >= (state.actionUntil || 0)) {
    return { grid: closeEyes(grid), note: dim(' 💤'), shift: 0 };
  }

  let g = grid;
  let note = '';
  let shift = 0;
  if (nowMs < (state.actionUntil || 0)) {
    // 🎵 dancing: a good prompt set actionUntil — hop side to side.
    shift = Math.floor(nowMs / 350) % 2;
    note = ' 🎵';
  } else if (Math.floor(nowMs / 600) % 9 === 0) {
    // 😌 idle blink: eyes shut for a single ~0.6s frame roughly every 5s.
    g = closeEyes(g);
  }

  // ✨ just evolved: sparkle for a few seconds (can coincide with a blink).
  if (stage !== 'egg' && state.lastEvolveTs && nowMs - state.lastEvolveTs < EVOLVE_MS) note = ' ✨';

  return { grid: g, note, shift };
}

// Full status-line string (newlines = extra rows).
export function render(state, pct, nowMs = Date.now()) {
  if (MINI) return renderMini(state, pct);
  if (state.dead || pct >= LIFESPAN_PCT) return renderDead(state);

  const stage = stageForPct(pct);
  const spec = SPRITES[state.currentForm] || SPRITES[STAGE_FALLBACK[stage]] || SPRITES.egg;
  const body = spec.body || CLAY;
  const frame = animate(spec.grid, state, nowMs, stage);

  // Apply the animation shift to the sprite. (The id line below is left-aligned like
  // the stat line, so it no longer tracks the sprite's hop — same as the old 가문 line.)
  const shifted = frame.grid.map((r) => '·'.repeat(frame.shift) + r);
  const art = shifted.map((row, i) => paintRow(row, body, spec.rainbow, i, spec.pal));

  // Compact layout: sprite, then id (이름 · 가문 · 세대) / (life-bar · stage · stats)
  // stacked tight with no blank rows between them — the pet stays small in the real
  // terminal. Only PAD_TOP/PAD_BOTTOM (braille blanks) give a little breathing room
  // above and below; SPACER renders empty yet isn't whitespace, so the per-line
  // left-trim and the wrapper's trailing-newline strip don't eat it.
  const statusLine = `${lifeBar(pct)}  ${dim(STAGE_LABEL[stage] || '')}   ${statSummary(state)}`;
  const lines = [
    ...Array(PAD_TOP).fill(SPACER),
    ...art,
    idLine(state, body, frame.note),
    statusLine,
  ];
  const ev = eventLine(state); if (ev) lines.push(ev);
  lines.push(...Array(PAD_BOTTOM).fill(SPACER));
  return lines.join('\n');
}
