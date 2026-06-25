// sprites.mjs — how a pet looks in the status line.
//
// Each pet is drawn as pixel art with Unicode blocks (one "pixel" = two columns,
// so it reads roughly square) in truecolor (256-colour fallback). Every node of
// the family tree has its own silhouette, and grade == looks: the better it was
// raised, the cuter/cleaner it is; the worse, the uglier (asymmetric eyes, eye
// bags, drool/snot, stubble, body holes, muddy colour).
//
// CLAUDCHI_SPRITE=mini gives the old one-line emoji rendering (small terminals).

import { node, stageForPct, LIFESPAN_PCT } from './chart.mjs';
import { deriveTraits } from './genome.mjs';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const COLORS = {
  cyan: '\x1b[36m', green: '\x1b[32m', magenta: '\x1b[35m',
  yellow: '\x1b[33m', blue: '\x1b[34m', red: '\x1b[31m', white: '\x1b[37m',
};
function color(text, name) { return `${COLORS[name] || ''}${text}${RESET}`; }
function dim(text) { return `${DIM}${text}${RESET}`; }

const MINI = (process.env.CLAUDCHI_SPRITE || '').toLowerCase() === 'mini';

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

// detail-pixel palette (shared across forms)
const EYE = [31, 23, 20];
const K = [36, 29, 24];      // dark detail: mouth / eye-bags / fangs / antenna
const S = [150, 110, 80];    // brown: stubble / egg speckle
const W = [174, 184, 106];   // gross yellow-green: drool / snot
const R = [215, 80, 70];     // red nose
const RAINBOW = [
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

function paintRow(row, body, rainbow, ri) {
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

const SPRITES = {
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
  master:          { body: [232, 192, 92], badge: '👑', grid: ['O·O·O·O', '·OOOOO·', 'OeOOOeO', 'OOOOOOO', 'OO·k·OO', '·O···O·'] },
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
};
const STAGE_FALLBACK = { egg: 'egg', baby: 'alklo', child: 'pyeongbeom', teen: 'diligent_avg', adult: 'model_citizen' };

const ACCESSORY_GLYPH = {
  none: '', glasses: '👓', bowtie: '🎀', crown: '👑',
  headphones: '🎧', scarf: '🧣', flower: '🌸',
};
const STAGE_LABEL = {
  egg: '알', baby: '유아기', child: '성장기', teen: '청년기', adult: '성체', dead: '죽음',
};

function lifeBar(pct) {
  const width = 12;
  const ratio = Math.max(0, Math.min(1, pct / LIFESPAN_PCT));
  const filled = Math.round(ratio * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const c = ratio < 0.5 ? 'green' : ratio < 0.8 ? 'yellow' : 'red';
  return `${color(bar, c)}  ${Math.round(pct)}% / ${LIFESPAN_PCT}%`;
}

// QTE-lite animated marker (phase from wall-clock).
export function qteBar(nowMs) {
  const period = 2400, width = 11;
  const pos = Math.floor(((nowMs % period) / period) * width);
  const center = Math.floor(width / 2);
  let bar = '';
  for (let i = 0; i < width; i++) bar += i === pos ? '●' : (Math.abs(i - center) <= 1 ? '▮' : '─');
  return color(`⚡️ QTE [${bar}] 가운데서 승인!`, 'yellow');
}

// labelled stat line — each icon spelled out, so it's clear what every score
// means. ⚡ needs an explicit emoji variation selector (U+FE0F); without it some
// terminals fall back to the narrow text glyph and it looks smaller than the rest.
function statSummary(state) {
  const r = (x) => Math.round(x || 0);
  return dim(`🧠 지능 ${r(state.intelligence)}   ⚡️ 성실 ${r(state.diligence)}   🧼 청결 ${r(state.cleanliness)}   ⭐ 순발 ${r(state.reflex)}   ❤️ 교감 ${r(state.bond)}`);
}

function identityLine(state, bodyRgb) {
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const acc = ACCESSORY_GLYPH[traits.accessory] || '';
  const spec = SPRITES[state.currentForm] || {};
  const badge = spec.badge ? spec.badge + ' ' : '';
  const gen = state.generation || 1;
  const grade = n.grade ? ` · ${n.grade}급` : '';
  const mood = state.sulking ? ' 😤' : '';
  const name = `${fg(bodyRgb)}${BOLD}${n.name}${RESET}`;
  return `${badge}${acc}${acc ? ' ' : ''}${name}${mood}   ${dim(`🏠 ${traits.family} · ${gen}세대${grade}`)}`;
}

function eventLine(state) {
  if (state.sulking) return color(`😤 삐졌어요: ${state.sulkReason}. 다정하게 말을 걸어 풀어주세요.`, 'magenta');
  if (state.challenge && state.challenge.armed) return qteBar(Date.now());
  if (state.quizPending) return color(`🧠 깜짝 퀴즈 진행 중! 다음 메시지로 답해보세요.`, 'cyan');
  return null;
}

function creatureLine(state) {
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const acc = ACCESSORY_GLYPH[traits.accessory] || '';
  const gen = state.generation || 1;
  const mood = state.sulking ? ' 😤삐짐' : '';
  return `${n.emoji}${acc} ${BOLD}${n.name}${RESET}${mood} ${dim(`· ${traits.family} ${gen}세대`)}`;
}

function renderDead(state) {
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const grade = n.grade || '-';
  const head = `🪦 RIP ${n.name} · ${grade}급 · ${state.generation || 1}세대 (${traits.family})`;
  const hint = '수명이 다했어요. /compact 하거나 새 세션을 열면 다음 세대가 태어납니다. /claudchi:breed 로 교배도 가능.';
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

// Full status-line string (newlines = extra rows).
export function render(state, pct) {
  if (MINI) return renderMini(state, pct);
  if (state.dead || pct >= LIFESPAN_PCT) return renderDead(state);

  const stage = stageForPct(pct);
  const spec = SPRITES[state.currentForm] || SPRITES[STAGE_FALLBACK[stage]] || SPRITES.egg;
  const body = spec.body || CLAY;
  const art = spec.grid.map((row, i) => paintRow(row, body, spec.rainbow, i));

  const lines = [...art, identityLine(state, body), `${lifeBar(pct)}  ${dim(STAGE_LABEL[stage] || '')}`, statSummary(state)];
  const ev = eventLine(state); if (ev) lines.push(ev);
  return lines.join('\n');
}
