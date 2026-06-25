// sprites.mjs — how a pet looks in the status line.
//
// The status line is a single command's stdout (newlines = extra rows), read-only
// and ANSI-capable. We render a compact, coloured creature whose look is shaped by
// its node (species) and its inherited traits (palette / accessory / family).

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

function creatureLine(state) {
  const n = node(state.currentForm);
  const traits = (state.genome && state.genome.traits) || deriveTraits(state);
  const acc = ACCESSORY_GLYPH[traits.accessory] || '';
  const gen = state.generation || 1;
  const mood = state.sulking ? ' 😤삐짐' : '';
  const head = color(`${n.emoji}${acc} ${BOLD}${n.name}${RESET}`, traits.palette);
  return `${head}${mood} ${dim(`· ${traits.family} ${gen}대`)}`;
}

// Returns the full status-line string (may contain newlines for extra rows).
export function render(state, pct) {
  if (state.dead || pct >= LIFESPAN_PCT) {
    const n = node(state.currentForm);
    const traits = (state.genome && state.genome.traits) || deriveTraits(state);
    const grade = n.grade || '-';
    return [
      color(`🪦 RIP ${n.emoji} ${n.name} · ${grade}급 · ${state.generation || 1}대 (${traits.family})`, 'red'),
      dim('수명이 다했어요. /compact 하거나 새 세션을 열면 다음 세대가 태어납니다. /claude-tamagotchi:breed 로 교배도 가능.'),
    ].join('\n');
  }

  const lines = [creatureLine(state)];
  const stage = STAGE_LABEL[stageForPct(pct)] || '';
  lines.push(`${lifeBar(pct)} ${dim(stage)}  ${statSummary(state)}`);

  if (state.sulking) {
    lines.push(color(`😤 삐졌어요: ${state.sulkReason}. 다정하게 말을 걸어 풀어주세요.`, 'magenta'));
  } else if (state.challenge && state.challenge.armed) {
    lines.push(qteBar(Date.now()));
  } else if (state.quizPending) {
    lines.push(color(`🧠 깜짝 퀴즈 진행 중! 다음 메시지로 답해보세요.`, 'cyan'));
  }
  return lines.join('\n');
}
