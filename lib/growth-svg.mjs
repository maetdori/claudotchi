// growth-svg.mjs — render the 성장 가계도 as a Tamagotchi-poster-style SVG.
//
// GitHub can't show the truecolor pixel art in a Markdown code block, so the README
// chart was ASCII. This emits a real image (SVG = crisp at any zoom, tiny, diff-able)
// laid out like a Tamagotchi evolution poster: 알→아기 at the top, a 🧠 split into
// three colour-coded 성장기 families, each splitting by ⚡ into two 청년기, each
// splitting by 🧼 into two 성체 (rows = 청결 상/하). Two 🔒 secrets sit in a vault.
//
//   node lib/growth-svg.mjs [outfile]   # default: ./assets/growth-chart.svg

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SPRITES, EYE, K, S, W, R, RAINBOW } from './sprites.mjs';
import { NODES } from './chart.mjs';

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ── theme ────────────────────────────────────────────────────────────────────
const INK = '#3f362c', SUB = '#9a8d79', TLINE = '#ece2cf';
const SHADOW = [150, 138, 120]; // secret silhouette — light enough to read on the vault
const COLW = 192, LEFT = 112, PX = 7;
const COL_COLOR = [[222, 96, 124], [44, 168, 178], [156, 116, 206]]; // 똘똘 / 평범 / 말썽
const GRADE = { S: '#edc65a', A: '#9ed7a2', B: '#92c4e6', C: '#ddca97', D: '#e6a17f', F: '#d294a0', '★': '#edc65a' };

// rough text width in px (CJK/emoji ≈ 1em, latin ≈ 0.56em) — for sizing pills
function textW(t, fs) {
  let w = 0;
  for (const ch of String(t)) {
    const c = ch.codePointAt(0);
    if (c === 0xfe0f) continue;
    const wide = c > 0x1100 && (c <= 0x115f || (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) || (c >= 0x2600 && c <= 0x27bf) || c >= 0x1f000);
    w += wide ? fs : fs * 0.56;
  }
  return w;
}

// ── data: build the fixed tree straight from NODES (no hand-kept duplicate) ─────
const childIds = ['high', 'mid', 'low'].map((t) => NODES.alklo.children[t]);
const TIER_INTEL = ['🧠 상', '🧠 중', '🧠 하'];
const columns = childIds.map((cid, ci) => ({
  id: cid, tier: TIER_INTEL[ci], color: COL_COLOR[ci],
  teens: ['high', 'low'].map((tt) => {
    const teenId = NODES[cid].children[tt];
    return {
      id: teenId, tier: tt === 'high' ? '⚡ 상' : '⚡ 하',
      adults: { high: NODES[teenId].children.high, low: NODES[teenId].children.low },
    };
  }),
}));

// ── geometry ────────────────────────────────────────────────────────────────
const teenCenter = (i) => LEFT + COLW * (i + 0.5);          // 6 teen columns (0..5)
const childCenter = (c) => (teenCenter(2 * c) + teenCenter(2 * c + 1)) / 2;
const colSpan = (c) => [teenCenter(2 * c) - COLW / 2, teenCenter(2 * c + 1) + COLW / 2];
const WIDTH = Math.round(LEFT + 6 * COLW + 22);
const Y_BABY = 124, Y_CHILD = 280, Y_TEEN = 416, Y_AD1 = 556, Y_AD2 = 696; // tile centres
const HEIGHT = 944;
const TW = 84, TH = 76; // creature tile

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
      const col = silhouette ? SHADOW
        : ch === 'O' ? (spec.rainbow ? RAINBOW[ri % RAINBOW.length] : spec.body)
        : ch === 'k' ? K : ch === 's' ? S : ch === 'w' ? W : ch === 'r' ? R : EYE;
      out += `<rect x="${ox + ci * PX}" y="${oy + ri * PX}" width="${PX}" height="${PX}" fill="${rgb(col)}"/>`;
    });
  });
  return out;
}

// a small rounded pill: filled bg + centred text (used for grade stickers)
function pill(cx, cy, text, { bg, fg = '#fff', fs = 11.5, bold = true, stroke = null }) {
  const w = textW(text, fs) + 18, h = fs + 10;
  const st = stroke ? ` stroke="${stroke}"` : '';
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}"${st}/>`
    + `<text x="${cx}" y="${cy + fs * 0.36}" font-size="${fs}"${bold ? ' font-weight="700"' : ''} fill="${fg}" text-anchor="middle">${esc(text)}</text>`;
}

// a tiny branch label that sits ON a connector — a white halo (paint-order) keeps
// it readable over the thin line and the family wash, no heavy filled chip needed.
function tag(cx, cy, text, color, fs = 11) {
  return `<text x="${cx}" y="${cy + fs * 0.35}" font-size="${fs}" font-weight="800" text-anchor="middle"`
    + ` fill="${color}" stroke="#fbf7ef" stroke-width="3.4" paint-order="stroke" stroke-linejoin="round">${esc(text)}</text>`;
}

// a creature on a soft tile: spotlight, sprite, name, corner grade sticker + badge
function creature(cx, cy, id, { showName = true } = {}) {
  const n = NODES[id];
  let s = `<rect x="${cx - TW / 2}" y="${cy - TH / 2}" width="${TW}" height="${TH}" rx="16" fill="url(#tile)" stroke="${TLINE}" filter="url(#ds)"/>`;
  s += `<ellipse cx="${cx}" cy="${cy - 1}" rx="30" ry="26" fill="#fff" opacity="0.55"/>`; // soft spotlight
  s += spriteSvg(id, cx, cy - 2);
  if (SPRITES[id]?.badge) s += `<text x="${cx - TW / 2 + 13}" y="${cy - TH / 2 + 17}" font-size="15" text-anchor="middle">${SPRITES[id].badge}</text>`;
  if (n.grade) {
    const g = n.grade === '★' ? '★' : n.grade;
    s += pill(cx + TW / 2 - 14, cy - TH / 2 + 3, g, { bg: GRADE[n.grade], fg: INK, fs: 11, });
  }
  if (showName) s += `<text x="${cx}" y="${cy + TH / 2 + 18}" font-size="13.5" font-weight="700" fill="${INK}" text-anchor="middle">${esc(n.name)}</text>`;
  return s;
}

// rounded-elbow connector parent→child (shared trunk overlaps harmlessly)
function connect(x0, y0, x1, y1, color, w = 2.5) {
  const midY = (y0 + y1) / 2, r = 16, dir = Math.sign(x1 - x0);
  const attrs = `stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="0.85"`;
  if (dir === 0) return `<path d="M${x0} ${y0} V${y1}" ${attrs}/>`;
  const d = `M${x0} ${y0} V${midY - r} Q${x0} ${midY} ${x0 + r * dir} ${midY} `
    + `H${x1 - r * dir} Q${x1} ${midY} ${x1} ${midY + r} V${y1}`;
  return `<path d="${d}" ${attrs}/>`;
}

export function growthSvg() {
  let defs = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbf7ef"/><stop offset="1" stop-color="#efe7d6"/>
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffefb"/><stop offset="1" stop-color="#f8f1e3"/>
    </linearGradient>
    <linearGradient id="vault" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#312a22"/><stop offset="1" stop-color="#241e18"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="${rgba([90, 70, 40], 0.045)}"/>
    </pattern>
    <filter id="ds" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#7a6644" flood-opacity="0.22"/>
    </filter>
  </defs>`;

  let s = '';

  // family colour washes (group each column visually, behind everything)
  columns.forEach((col, c) => {
    const [x0, x1] = colSpan(c);
    s += `<rect x="${x0 + 8}" y="${Y_CHILD - 70}" width="${x1 - x0 - 16}" height="${Y_AD2 - Y_CHILD + 116}" rx="22" fill="${rgb(col.color)}" opacity="0.055"/>`;
    // header band behind the child + its tier pill
    s += `<rect x="${x0 + 8}" y="${Y_CHILD - 70}" width="${x1 - x0 - 16}" height="124" rx="20" fill="${rgb(col.color)}" opacity="0.13"/>`;
  });

  // title + one-line legend explaining what drives each stage's branch
  s += `<text x="${WIDTH / 2}" y="48" font-size="27" font-weight="800" fill="${INK}" text-anchor="middle">🥚 클로도치 성장 가계도</text>`;
  s += `<text x="${WIDTH / 2}" y="72" font-size="13" fill="${SUB}" text-anchor="middle">단계마다 다른 케어 스탯이 다음 모습을 결정해요 — 성장기 🧠지능 · 청년기 ⚡성실 · 성체 🧼청결 · 높을수록(상) 더 좋은 형태로</text>`;

  // left rail: stage names only (the driving stat now lives in the legend above
  // and as 상/중/하 tags on each branch — no more confusing duplicate label)
  const railX = 18;
  const rail = (y, emoji, big) =>
    `<text x="${railX}" y="${y - 9}" font-size="15">${emoji}</text>` +
    `<text x="${railX}" y="${y + 11}" font-size="13" font-weight="800" fill="${INK}">${big}</text>`;
  s += rail(Y_BABY, '🐣', '유아기');
  s += rail(Y_CHILD, '🐤', '성장기');
  s += rail(Y_TEEN, '🧒', '청년기');
  s += rail((Y_AD1 + Y_AD2) / 2, '🧑', '성체');

  // 알 → 아기 (top), joined by a dashed hatch arrow
  const babyX = WIDTH / 2;
  s += `<path d="M${babyX - 30} ${Y_BABY} H${babyX + 28}" stroke="${SUB}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round" marker-end="url(#arrow)"/>`;
  defs = defs.replace('</defs>', `<marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="${SUB}"/></marker></defs>`);
  s += creature(babyX - 72, Y_BABY, 'egg');
  s += creature(babyX + 72, Y_BABY, 'alklo');

  // 아기 → 3 성장기 families (🧠 tier tag sits above each family band)
  columns.forEach((col, c) => {
    s += connect(babyX + 72, Y_BABY + 46, childCenter(c), Y_CHILD - 70, '#cba75e');
    s += tag(childCenter(c), Y_CHILD - 84, col.tier, rgb(col.color), 11.5);
  });

  columns.forEach((col, c) => {
    const ccx = childCenter(c), color = rgb(col.color);
    s += creature(ccx, Y_CHILD, col.id);

    col.teens.forEach((teen, t) => {
      const tcx = teenCenter(2 * c + t);
      // 성장기 → 청년기, ⚡ tag on the drop into the teen
      s += connect(ccx, Y_CHILD + 54, tcx, Y_TEEN - 42, color);
      const dropMid = (((Y_CHILD + 54 + Y_TEEN - 42) / 2) + (Y_TEEN - 42)) / 2;
      s += tag(tcx, dropMid, teen.tier, color, 10.5);
      s += creature(tcx, Y_TEEN, teen.id);
      // 청년기 → 2 성체 (청결 상 row / 청결 하 row), 🧼 tags on each drop
      s += connect(tcx, Y_TEEN + 42, tcx, Y_AD1 - 42, color);
      s += tag(tcx, (Y_TEEN + 42 + Y_AD1 - 42) / 2, '🧼 상', color, 10.5);
      s += connect(tcx, Y_AD1 + 42, tcx, Y_AD2 - 42, color);
      s += tag(tcx, (Y_AD1 + 42 + Y_AD2 - 42) / 2, '🧼 하', color, 10.5);
      s += creature(tcx, Y_AD1, teen.adults.high);
      s += creature(tcx, Y_AD2, teen.adults.low);
    });
  });

  // 🔒 secret vault (bottom)
  const secrets = Object.keys(NODES).filter((id) => NODES[id].hidden);
  const boxY = Y_AD2 + 74, boxX = LEFT, boxW = WIDTH - LEFT - 22, boxH = 126;
  s += `<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="18" fill="url(#vault)" filter="url(#ds)"/>`;
  s += `<rect x="${boxX + 6}" y="${boxY + 6}" width="${boxW - 12}" height="${boxH - 12}" rx="14" fill="none" stroke="#e8c15c" stroke-opacity="0.35" stroke-dasharray="3 5"/>`;
  s += `<text x="${boxX + 26}" y="${boxY + 40}" font-size="17" font-weight="800" fill="#edc65a">🔒 시크릿 — 실루엣만 공개</text>`;
  s += `<text x="${boxX + 26}" y="${boxY + 64}" font-size="12.5" fill="#cabda7">특정 조건에서만 분기하는 히든 도치. 직접 키워서 확인하세요.</text>`;
  s += `<text x="${boxX + 26}" y="${boxY + 86}" font-size="12" fill="#9c8f79">🌟 레전도치 · 3세대↑ + ❤️10↑　　🐱 냥냥도치 · 마페도치 ❤️12↑</text>`;
  secrets.forEach((id, i) => {
    const cx = boxX + boxW - 268 + i * 144, cy = boxY + boxH / 2 + 2;
    s += `<rect x="${cx - 42}" y="${cy - 38}" width="84" height="76" rx="16" fill="#3b352c" stroke="#5a4f3f" stroke-dasharray="4 3"/>`;
    s += `<text x="${cx + 26}" y="${cy - 22}" font-size="14" opacity="0.5">❔</text>`;
    s += spriteSvg(id, cx, cy - 1, true);
    s += `<text x="${cx}" y="${cy + 52}" font-size="12.5" font-weight="700" fill="#cabda7" text-anchor="middle" letter-spacing="3">？？？</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="-apple-system,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif">
  ${defs}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dots)"/>
  ${s}
</svg>`;
}

// CLI: write the standalone SVG file (for the README image). Only when run
// directly — dogam.mjs imports growthSvg() to inline the same poster.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2] || fileURLToPath(new URL('../assets/growth-chart.svg', import.meta.url));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, growthSvg());
  console.log(`가계도 written → ${out}`);
}
