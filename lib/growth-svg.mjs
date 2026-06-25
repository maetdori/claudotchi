// growth-svg.mjs — render the 성장 가계도 as a Tamagotchi-poster-style SVG.
//
// GitHub can't show the truecolor pixel art in a Markdown code block, so the README
// chart was ASCII. This emits a real image (SVG = crisp at any zoom, tiny, diff-able)
// laid out like a Tamagotchi evolution poster: 알→아기 at the top, a 🧠 split into
// three colour-coded 성장기 columns, each splitting by ⚡ into two 청년기, each
// splitting by 🧼 into two 성체 (rows = 청결 高/低). Two 🔒 secrets sit in a side box.
//
//   node lib/growth-svg.mjs [outfile]   # default: ./assets/growth-chart.svg

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPRITES, EYE, K, S, W, R, RAINBOW } from './sprites.mjs';
import { NODES } from './chart.mjs';

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ── theme ────────────────────────────────────────────────────────────────────
const BG = '#f7f2e8', INK = '#3a322a', SUB = '#8a7d6b', TILE = '#fffdf8', TLINE = '#e7ddc9';
const SHADOW = [156, 144, 126]; // secret silhouette — light enough to read on the dark box
const COLW = 188, LEFT = 104, PX = 7;
const COL_COLOR = [[216, 92, 120], [56, 166, 176], [150, 112, 200]]; // 똘똘 / 평범 / 말썽
const GRADE = { S: '#e8c15c', A: '#9fd3a0', B: '#8fc1e3', C: '#d9c79a', D: '#e0a07f', F: '#c98c8c', '★': '#e8c15c' };

// ── data: build the fixed tree straight from NODES (no hand-kept duplicate) ─────
const childIds = ['high', 'mid', 'low'].map((t) => NODES.alklo.children[t]);
const TIER_INTEL = ['🧠 高', '🧠 중', '🧠 低'];
const columns = childIds.map((cid, ci) => ({
  id: cid, tier: TIER_INTEL[ci], color: COL_COLOR[ci],
  teens: ['high', 'low'].map((tt) => {
    const teenId = NODES[cid].children[tt];
    return {
      id: teenId, tier: tt === 'high' ? '⚡ 高' : '⚡ 低',
      adults: { high: NODES[teenId].children.high, low: NODES[teenId].children.low },
    };
  }),
}));

// ── geometry ────────────────────────────────────────────────────────────────
const teenCenter = (i) => LEFT + COLW * (i + 0.5);          // 6 teen columns (0..5)
const childCenter = (c) => (teenCenter(2 * c) + teenCenter(2 * c + 1)) / 2;
const WIDTH = Math.round(LEFT + 6 * COLW + 20);
const Y_BABY = 120, Y_CHILD = 262, Y_TEEN = 398, Y_AD1 = 536, Y_AD2 = 674; // tile centres
const HEIGHT = 912;

// ── sprite → svg pixels, centred on (cx, cy) ───────────────────────────────────
function spriteSvg(id, cx, cy, silhouette = false) {
  const spec = SPRITES[id];
  const cols = Math.max(...spec.grid.map((r) => r.length));
  const rows = spec.grid.length;
  const ox = cx - (cols * PX) / 2, oy = cy - (rows * PX) / 2;
  let out = '';
  spec.grid.forEach((row, ri) => {
    [...row.padEnd(cols, '·')].forEach((ch, ci) => {
      if (ch === '·' || ch === ' ') return;
      let col = silhouette ? SHADOW
        : ch === 'O' ? (spec.rainbow ? RAINBOW[ri % RAINBOW.length] : spec.body)
        : ch === 'k' ? K : ch === 's' ? S : ch === 'w' ? W : ch === 'r' ? R : EYE;
      out += `<rect x="${ox + ci * PX}" y="${oy + ri * PX}" width="${PX}" height="${PX}" fill="${rgb(col)}"/>`;
    });
  });
  return out;
}

// a creature on a rounded tile, with name + optional grade + tier chips below
function creature(cx, cy, id, { tier, showName = true } = {}) {
  const n = NODES[id];
  const TW = 78, TH = 70;
  let s = `<rect x="${cx - TW / 2}" y="${cy - TH / 2}" width="${TW}" height="${TH}" rx="14" fill="${TILE}" stroke="${TLINE}"/>`;
  if (SPRITES[id]?.badge) s += `<text x="${cx + TW / 2 - 12}" y="${cy - TH / 2 + 16}" font-size="15" text-anchor="middle">${SPRITES[id].badge}</text>`;
  s += spriteSvg(id, cx, cy - 2);
  if (showName) {
    const grade = n.grade ? ` <tspan fill="${GRADE[n.grade] || SUB}" font-weight="700">${n.grade === '★' ? '★' : n.grade + '급'}</tspan>` : '';
    s += `<text x="${cx}" y="${cy + TH / 2 + 17}" font-size="13.5" font-weight="600" fill="${INK}" text-anchor="middle">${esc(n.name)}${grade}</text>`;
  }
  if (tier) s += `<text x="${cx}" y="${cy + TH / 2 + 33}" font-size="11.5" fill="${SUB}" text-anchor="middle">${tier}</text>`;
  return s;
}

// rounded "bus" connector: parent drops to a shared bar, then to each child x
function bus(parentX, parentY, childXs, childY, color) {
  const midY = (parentY + childY) / 2;
  const x0 = Math.min(...childXs), x1 = Math.max(...childXs);
  let s = `<g stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none">`;
  s += `<path d="M${parentX} ${parentY} V${midY}"/>`;
  s += `<path d="M${x0} ${midY} H${x1}"/>`;
  for (const x of childXs) s += `<path d="M${x} ${midY} V${childY}"/>`;
  return s + '</g>';
}
const line = (x, y0, y1, color) => `<path d="M${x} ${y0} V${y1}" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>`;

// rounded band behind a column header
function band(c) {
  const x0 = teenCenter(2 * c) - COLW / 2 + 8, w = COLW * 2 - 16;
  return `<rect x="${x0}" y="${Y_CHILD - 54}" width="${w}" height="108" rx="18" fill="${rgb(c >= 0 ? COL_COLOR[c] : SHADOW)}" opacity="0.14"/>`;
}

function svg() {
  let s = '';
  // title
  s += `<text x="${WIDTH / 2}" y="44" font-size="26" font-weight="800" fill="${INK}" text-anchor="middle">🥚 클로도치 성장 가계도</text>`;
  s += `<text x="${WIDTH / 2}" y="68" font-size="13.5" fill="${SUB}" text-anchor="middle">나이 = 컨텍스트 사용률 · 분기는 케어 스탯이 결정 (경로 의존적, 랜덤 아님)</text>`;

  // stage / branch-stat labels down the left rail
  const railX = 18;
  const rail = (y, big, small) =>
    `<text x="${railX}" y="${y}" font-size="13" font-weight="700" fill="${INK}">${big}</text>` +
    (small ? `<text x="${railX}" y="${y + 17}" font-size="11" fill="${SUB}">${small}</text>` : '');
  s += rail(Y_CHILD - 4, '성장기', '🧠 지능');
  s += rail(Y_TEEN - 4, '청년기', '⚡ 성실');
  s += rail(Y_AD1 - 6, '성체', '🧼 청결 高');
  s += rail(Y_AD2 - 6, '성체', '🧼 청결 低');

  // 알 → 아기 (top)
  const babyX = WIDTH / 2;
  s += creature(babyX - 70, Y_BABY, 'egg', { showName: true });
  s += `<text x="${babyX - 6}" y="${Y_BABY + 2}" font-size="20" fill="${SUB}" text-anchor="middle">→</text>`;
  s += creature(babyX + 70, Y_BABY, 'alklo', { showName: true });

  // 아기 → 3 성장기 columns (start the bus below the 아기도치 name, not through it)
  s += bus(babyX + 70, Y_BABY + 60, columns.map((_, c) => childCenter(c)), Y_CHILD - 54, '#caa15a');

  columns.forEach((col, c) => {
    const ccx = childCenter(c), color = rgb(col.color);
    s += band(c);
    s += creature(ccx, Y_CHILD, col.id, { tier: col.tier });

    // 성장기 → its 2 청년기
    s += bus(ccx, Y_CHILD + 54, col.teens.map((_, t) => teenCenter(2 * c + t)), Y_TEEN - 38, color);

    col.teens.forEach((teen, t) => {
      const tcx = teenCenter(2 * c + t);
      s += creature(tcx, Y_TEEN, teen.id, { tier: teen.tier });
      // 청년기 → 2 성체 (청결 高 row / 청결 低 row)
      s += line(tcx, Y_TEEN + 38, Y_AD1 - 38, color);
      s += line(tcx, Y_AD1 + 38, Y_AD2 - 38, color);
      s += creature(tcx, Y_AD1, teen.adults.high, {});
      s += creature(tcx, Y_AD2, teen.adults.low, {});
    });
  });

  // 🔒 secret box (bottom)
  const secrets = Object.keys(NODES).filter((id) => NODES[id].hidden);
  const boxY = Y_AD2 + 70, boxX = LEFT, boxW = WIDTH - LEFT - 20, boxH = 122;
  s += `<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="16" fill="#2b2620"/>`;
  s += `<text x="${boxX + 22}" y="${boxY + 34}" font-size="16" font-weight="800" fill="#e8c15c">🔒 시크릿 — 실루엣만 공개</text>`;
  s += `<text x="${boxX + 22}" y="${boxY + 56}" font-size="12.5" fill="#c9bca8">특정 조건에서만 분기하는 히든 도치. 직접 키워서 확인하세요.</text>`;
  secrets.forEach((id, i) => {
    const cx = boxX + boxW - 280 + i * 150, cy = boxY + boxH / 2 + 4;
    s += `<rect x="${cx - 39}" y="${cy - 35}" width="78" height="70" rx="14" fill="#3a342c" stroke="#4c4339" stroke-dasharray="4 3"/>`;
    s += spriteSvg(id, cx, cy - 2, true);
    s += `<text x="${cx}" y="${cy + 50}" font-size="12.5" font-weight="700" fill="#c9bca8" text-anchor="middle" letter-spacing="2">❔ ？？？</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="-apple-system,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  ${s}
</svg>`;
}

const out = process.argv[2] || fileURLToPath(new URL('../assets/growth-chart.svg', import.meta.url));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg());
console.log(`가계도 written → ${out}`);
