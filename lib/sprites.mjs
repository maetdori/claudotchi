// sprites.mjs — how a pet looks in the status line.
//
// The status line is a single command's stdout (newlines = extra rows), read-only
// and ANSI-capable. We draw the Claude mascot as pixel art with Unicode blocks
// (each "pixel" = two columns, so it reads roughly square) in truecolor. The same
// little creature grows stage by stage (egg → baby → … → adult) and, once adult,
// takes on a colour / eyes / badge that reflect how it was raised.
//
// Set CLAUDCHI_SPRITE=mini for the old one-line emoji rendering (small terminals).

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

// ── truecolor helpers (with a 256-colour fallback) ────────────────────────────
const CT = (process.env.COLORTERM || '').toLowerCase();
const TRUECOLOR = CT.includes('truecolor') || CT.includes('24bit');

function to256(r, g, b) {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const f = (x) => Math.round((x / 255) * 5);
  return 16 + 36 * f(r) + 6 * f(g) + f(b);
}
function fg(rgb) {
  const [r, g, b] = rgb;
  return TRUECOLOR ? `\x1b[38;2;${r};${g};${b}m` : `\x1b[38;5;${to256(r, g, b)}m`;
}

const BASE_RGB = [215, 119, 87]; // Claude clay orange — the mascot's default body
const EYE_RGB = [40, 30, 28];
const RAINBOW = [
  [230, 90, 90], [230, 170, 80], [225, 215, 90],
  [110, 200, 120], [100, 160, 230], [175, 120, 215],
];

// Pixel grids. 'O' = body, 'e' = eye, anything else = empty. The creature grows
// taller/wider as it ages; the egg has no eyes (not hatched yet).
const SPRITES = {
  egg:   ['.OO.', 'OOOO', '.OO.'],
  baby:  ['.OO.', 'OeeO', '.OO.'],
  child: ['.OO.', 'OeeO', 'OOOO', '.OO.'],
  teen:  ['.OOO.', 'OeOeO', 'OOOOO', '.O.O.'],
  adult: ['.OOOO.', 'OeOOeO', 'OOOOOO', '.O..O.'],
};

// Per-adult-form styling: body colour, optional eye glyph, optional badge.
// Non-listed adults fall back to the base orange. Earlier stages are always orange.
const FORM_STYLE = {
  master:          { rgb: [232, 192, 92], badge: '👑' },
  nerd:            { rgb: [90, 185, 175] },
  pro:             { rgb: [92, 150, 225] },
  basement_genius: { rgb: [150, 120, 195] },
  model_citizen:   { rgb: [120, 195, 120] },
  glutton:         { rgb: [225, 140, 160] },
  mypace:          { rgb: [180, 160, 215] },
  lazy:            { rgb: [155, 155, 155], eyes: '--' },
  clown:           { rgb: [225, 120, 205] },
  berserk:         { rgb: [215, 80, 70] },
  zombie:          { rgb: [140, 165, 95], eyes: 'xx' },
  oyaji:           { rgb: [150, 130, 110], eyes: '--' },
  legend:          { rgb: [232, 205, 120], badge: '🌟', rainbow: true },
};

function paintRow(row, bodyRgb, eyes) {
  const B = fg(bodyRgb);
  const E = fg(EYE_RGB);
  let out = '';
  for (const ch of row) {
    if (ch === 'O') out += `${B}██${RESET}`;
    else if (ch === 'e') out += eyes ? `${E}${eyes}${RESET}` : `${E}██${RESET}`;
    else out += '  ';
  }
  return out;
}

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
  return `${color(bar, c)} ${Math.round(pct)}%/${LIFESPAN_PCT}`;
}

// QTE-lite: an animated marker. Phase comes from wall-clock so it moves on each
// status refresh. Coarse by nature (refresh is debounced) — flavour, not a real QTE.
export function qteBar(nowMs) {
  const period = 2400;
  const width = 11;
  const pos = Math.floor(((nowMs % period) / period) * width);
  const center = Math.floor(width / 2);
  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i === pos) bar += '●';
    else if (Math.abs(i - center) <= 1) bar += '▮';
    else bar += '─';
  }
  return color(`⚡ QTE [${bar}] 가운데서 승인!`, 'yellow');
}

function statSummary(state) {
  const r = (x) => Math.round(x || 0);
  return dim(`🧠${r(state.intelligence)} ⚡${r(state.diligence)} 🧼${r(state.cleanliness)} ⭐${r(state.reflex)} ❤️${r(state.bond)}`);
}

// One-line emoji rendering used by CLAUDCHI_SPRITE=mini.
function creatureLine(state) {
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const acc = ACCESSORY_GLYPH[traits.accessory] || '';
  const gen = state.generation || 1;
  const mood = state.sulking ? ' 😤삐짐' : '';
  const head = color(`${n.emoji}${acc} ${BOLD}${n.name}${RESET}`, traits.palette);
  return `${head}${mood} ${dim(`· ${traits.family} ${gen}대`)}`;
}

function eventLine(state) {
  if (state.sulking) return color(`😤 삐졌어요: ${state.sulkReason}. 다정하게 말을 걸어 풀어주세요.`, 'magenta');
  if (state.challenge && state.challenge.armed) return qteBar(Date.now());
  if (state.quizPending) return color(`🧠 깜짝 퀴즈 진행 중! 다음 메시지로 답해보세요.`, 'cyan');
  return null;
}

function renderDead(state) {
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const grade = n.grade || '-';
  const head = `🪦 RIP ${n.emoji} ${n.name} · ${grade}급 · ${state.generation || 1}대 (${traits.family})`;
  const hint = '수명이 다했어요. /compact 하거나 새 세션을 열면 다음 세대가 태어납니다. /claudchi:breed 로 교배도 가능.';
  if (MINI) return [color(head, 'red'), dim(hint)].join('\n');
  const grave = ['  ____  ', ' /    \\ ', ' | RIP| ', '_|____|_'].map((r) => dim(r));
  return [...grave, color(head, 'red'), dim(hint)].join('\n');
}

function renderMini(state, pct) {
  if (state.dead || pct >= LIFESPAN_PCT) return renderDead(state);
  const lines = [creatureLine(state)];
  lines.push(`${lifeBar(pct)} ${dim(STAGE_LABEL[stageForPct(pct)] || '')}  ${statSummary(state)}`);
  const ev = eventLine(state);
  if (ev) lines.push(ev);
  return lines.join('\n');
}

// Returns the full status-line string (may contain newlines for extra rows).
export function render(state, pct) {
  if (MINI) return renderMini(state, pct);
  if (state.dead || pct >= LIFESPAN_PCT) return renderDead(state);

  const stage = stageForPct(pct);
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const style = (stage === 'adult' && FORM_STYLE[state.currentForm]) || {};
  const bodyRgb = style.rgb || BASE_RGB;
  const grid = SPRITES[stage] || SPRITES.egg;

  const art = grid.map((row, i) =>
    paintRow(row, style.rainbow ? RAINBOW[i % RAINBOW.length] : bodyRgb, style.eyes));

  const acc = ACCESSORY_GLYPH[traits.accessory] || '';
  const badge = style.badge || '';
  const gen = state.generation || 1;
  const grade = n.grade ? ` ${n.grade}급` : '';
  const mood = state.sulking ? ' 😤' : '';
  const name = `${fg(bodyRgb)}${BOLD}${n.name}${RESET}`;
  const info = `${badge}${acc}${name}${mood} ${dim(`· ${traits.family} ${gen}대${grade}`)}`;
  const bar = `${lifeBar(pct)} ${dim(STAGE_LABEL[stage] || '')}  ${statSummary(state)}`;

  const lines = [...art, info, bar];
  const ev = eventLine(state);
  if (ev) lines.push(ev);
  return lines.join('\n');
}
