// growth-svg.mjs — render the 성장 가계도 as a dark Tamagotchi-poster SVG.
//
// GitHub can't show the truecolor pixel art in a Markdown code block, so the README
// chart was ASCII. This emits a real image (SVG = crisp at any zoom, tiny, diff-able)
// laid out like a Tamagotchi evolution poster: 알→아기 at the top, a 🧠 split into
// three colour-coded 성장기 families, each splitting by ⚡ into two 청년기, each
// splitting by 🧼 into two 성체 (rows = 청결 상/하). Two 🔒 secrets sit in a vault.
//
// Theme: the poster chrome (background, connectors, title, vault) is dark to match
// the dothome-toned site, but each creature sits on a LIGHT cream tile — a "display
// case", like the 도감 gallery frames — because the sprites carry near-black detail
// pixels (eyes/mouth) that would vanish on a dark tile. Dark page, lit specimens.
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

// ── theme (dark poster · light tiles) ──────────────────────────────────────────
const INK = '#f2e9db';      // light text on the dark poster (title, names, rail)
const SUB = '#a99c89';      // muted text
const GOLD = '#e8c15c';     // accent
const CLAY = '#d77757';
const TILE_LINE = '#e7ddc9'; // border around the light creature tiles
const HALO = '#161109';     // dark halo behind tiny branch tags (near bg)
const PILL_INK = '#14110e'; // dark text on the bright grade pills
const SHADOW = [150, 138, 120]; // secret silhouette — reads on the dark vault
const COLW = 208, LEFT = 112, PX = 7;
const COL_COLOR = [[226, 108, 134], [58, 182, 190], [168, 130, 214]]; // 똘똘 / 평범 / 말썽 (lifted for dark)
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
const Y_BABY = 140, Y_CHILD = 296, Y_TEEN = 452, Y_ADULT = 632; // tile-centre rows
const ADX = 48; // 성체 형제쌍 좌우 오프셋 — 청결 상=왼쪽 / 하=오른쪽 (범례의 "왼쪽=상"과 일치)
const NAME_CLR = 66; // parent→child 연결선은 타일 중심에서 이만큼 아래(=이름 밑)에서 출발해 이름과 안 겹치게
const HEIGHT = 874;
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
        : ch === 'k' ? K : ch === 's' ? S : ch === 'w' ? W : ch === 'r' ? R
        : (spec.pal && spec.pal[ch]) ? spec.pal[ch] : EYE;
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

// a branch label that sits ON a connector — a small solid chip (dark fill + coloured
// border/text) so the tree's branching RULES read crisply instead of getting lost as
// thin haloed text over the wires.
function tag(cx, cy, text, color, fs = 12) {
  const w = textW(text, fs) + 15, h = fs + 9;
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${HALO}" stroke="${color}" stroke-opacity="0.55"/>`
    + `<text x="${cx}" y="${cy + fs * 0.35}" font-size="${fs}" font-weight="800" text-anchor="middle" fill="${color}">${esc(text)}</text>`;
}

// a creature on a light display tile: glow, sprite, name, corner grade sticker + badge
function creature(cx, cy, id, { showName = true } = {}) {
  const n = NODES[id];
  let s = `<rect x="${cx - TW / 2}" y="${cy - TH / 2}" width="${TW}" height="${TH}" rx="16" fill="url(#tile)" stroke="${TILE_LINE}" filter="url(#ds)"/>`;
  s += `<ellipse cx="${cx}" cy="${cy - 1}" rx="30" ry="26" fill="#ffffff" opacity="0.5"/>`; // soft spotlight
  s += spriteSvg(id, cx, cy - 2);
  if (SPRITES[id]?.badge) s += `<text x="${cx - TW / 2 + 13}" y="${cy - TH / 2 + 17}" font-size="15" text-anchor="middle">${SPRITES[id].badge}</text>`;
  if (n.grade) {
    const g = n.grade === '★' ? '★' : n.grade;
    s += pill(cx + TW / 2 - 14, cy - TH / 2 + 3, g, { bg: GRADE[n.grade], fg: PILL_INK, fs: 11 });
  }
  // dark halo (paint-order:stroke → stroke behind fill) so the name stays legible even
  // where a connector line or a family band passes right under it.
  if (showName) s += `<text x="${cx}" y="${cy + TH / 2 + 19}" font-size="14" font-weight="700" fill="${INK}" stroke="#15100a" stroke-width="3.4" paint-order="stroke" stroke-linejoin="round" text-anchor="middle">${esc(n.name)}</text>`;
  return s;
}

// rounded-elbow connector parent→child (shared trunk overlaps harmlessly)
function connect(x0, y0, x1, y1, color, w = 2.8, r = 16) {
  const midY = (y0 + y1) / 2, dir = Math.sign(x1 - x0);
  const attrs = `stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="0.9"`;
  if (dir === 0) return `<path d="M${x0} ${y0} V${y1}" ${attrs}/>`;
  const d = `M${x0} ${y0} V${midY - r} Q${x0} ${midY} ${x0 + r * dir} ${midY} `
    + `H${x1 - r * dir} Q${x1} ${midY} ${x1} ${midY + r} V${y1}`;
  return `<path d="${d}" ${attrs}/>`;
}

export function growthSvg() {
  let defs = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#20190f"/><stop offset="1" stop-color="#140f0a"/>
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fdf7ea"/><stop offset="1" stop-color="#efe3cd"/>
    </linearGradient>
    <linearGradient id="vault" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#241f19"/><stop offset="1" stop-color="#181310"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="${rgba([233, 214, 176], 0.03)}"/>
    </pattern>
    <filter id="ds" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>`;

  let s = '';

  // family colour washes (group each column visually, behind everything)
  columns.forEach((col, c) => {
    const [x0, x1] = colSpan(c);
    // one even wash for the whole family box (no darker header band — it made only the
    // 성장기 row look tinted; keeping the tone uniform reads as one group cleanly).
    s += `<rect x="${x0 + 8}" y="${Y_CHILD - 70}" width="${x1 - x0 - 16}" height="${Y_ADULT - Y_CHILD + 138}" rx="22" fill="${rgb(col.color)}" opacity="0.12"/>`;
  });

  // title + one-line legend explaining what drives each stage's branch
  s += `<text x="${WIDTH / 2}" y="48" font-size="27" font-weight="800" fill="${INK}" text-anchor="middle">🥚 클로도치 성장 가계도</text>`;
  s += `<text x="${WIDTH / 2}" y="79" font-size="13.5" fill="#c6bba7" text-anchor="middle">단계마다 다른 케어 스탯이 다음 모습을 결정 — 성장기 🧠지능 · 청년기 ⚡성실 · 성체 🧼청결 · 위/왼쪽일수록(상) 더 좋은 형태</text>`;

  // left rail: stage names only (the driving stat lives in the legend above and as
  // 상/중/하 tags on each branch — no confusing duplicate label)
  const railX = 18;
  const rail = (y, emoji, big) =>
    `<text x="${railX}" y="${y - 9}" font-size="15">${emoji}</text>` +
    `<text x="${railX}" y="${y + 11}" font-size="13" font-weight="800" fill="${INK}">${big}</text>`;
  s += rail(Y_BABY, '🐣', '유아기');
  s += rail(Y_CHILD, '🐤', '성장기');
  s += rail(Y_TEEN, '🧒', '청년기');
  s += rail(Y_ADULT, '🧑', '성체');

  // 알 → 아기 (top), joined by a dashed hatch arrow
  const babyX = WIDTH / 2;
  s += `<path d="M${babyX - 30} ${Y_BABY} H${babyX + 28}" stroke="${SUB}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round" marker-end="url(#arrow)"/>`;
  defs = defs.replace('</defs>', `<marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="${SUB}"/></marker></defs>`);
  s += creature(babyX - 72, Y_BABY, 'egg');
  s += creature(babyX + 72, Y_BABY, 'alklo');

  // 아기 → 3 성장기 families (🧠 tier tag sits above each family band)
  columns.forEach((col, c) => {
    // start below 아기도치's name (like every other parent) — the drop to the rail is
    // short, so use a small corner radius so the elbow still fits.
    s += connect(babyX + 72, Y_BABY + NAME_CLR, childCenter(c), Y_CHILD - 70, GOLD, 2.8, 8);
    s += tag(childCenter(c), Y_CHILD - 84, col.tier, rgb(col.color), 13);
  });

  columns.forEach((col, c) => {
    const ccx = childCenter(c), color = rgb(col.color);
    s += creature(ccx, Y_CHILD, col.id);

    col.teens.forEach((teen, t) => {
      const tcx = teenCenter(2 * c + t);
      // 성장기 → 청년기, ⚡ tag on the drop into the teen
      s += connect(ccx, Y_CHILD + NAME_CLR, tcx, Y_TEEN - 42, color);
      const dropMid = (((Y_CHILD + NAME_CLR + Y_TEEN - 42) / 2) + (Y_TEEN - 42)) / 2;
      s += tag(tcx, dropMid, teen.tier, color, 11.5);
      s += creature(tcx, Y_TEEN, teen.id);
      // 청년기 → 2 성체 (형제): a symmetric ∨ fork with the pair side-by-side in one row —
      // 청결 상 on the LEFT, 하 on the RIGHT (matches the legend's 왼쪽=상). Reads as siblings
      // at a glance: no vertical chain, no detour. Grade stickers flag the better one → no 🧼 tag.
      const hx = tcx - ADX, lx = tcx + ADX;
      s += connect(tcx, Y_TEEN + NAME_CLR, hx, Y_ADULT - 42, color); // teen → 상 (left)
      s += connect(tcx, Y_TEEN + NAME_CLR, lx, Y_ADULT - 42, color); // teen → 하 (right)
      s += creature(hx, Y_ADULT, teen.adults.high);
      s += creature(lx, Y_ADULT, teen.adults.low);
    });
  });

  // 🔒 secret vault (bottom)
  const secrets = Object.keys(NODES).filter((id) => NODES[id].hidden);
  const boxY = Y_ADULT + 74, boxX = LEFT, boxW = WIDTH - LEFT - 22, boxH = 126;
  s += `<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="18" fill="url(#vault)" stroke="#3a3227" filter="url(#ds)"/>`;
  s += `<rect x="${boxX + 6}" y="${boxY + 6}" width="${boxW - 12}" height="${boxH - 12}" rx="14" fill="none" stroke="${GOLD}" stroke-opacity="0.4" stroke-dasharray="3 5"/>`;
  s += `<text x="${boxX + 26}" y="${boxY + 40}" font-size="17" font-weight="800" fill="${GOLD}">🔒 시크릿 — 실루엣만 공개</text>`;
  s += `<text x="${boxX + 26}" y="${boxY + 64}" font-size="12.5" fill="#cabda7">특정 조건에서만 분기하는 히든 도치. 직접 키워서 확인하세요.</text>`;
  s += `<text x="${boxX + 26}" y="${boxY + 87}" font-size="12.5" fill="#b6a891">🌟 레전도치 · 3세대↑+❤️10↑　🐱 냥냥도치 · 마페도치 ❤️12↑　🍥 나루토치 · 방치도치 ⚡극대+❤️↑</text>`;
  // right-aligned silhouette cards — spacing generalises to any number of secrets.
  secrets.forEach((id, i) => {
    const cx = boxX + boxW - 60 - (secrets.length - 1 - i) * 132, cy = boxY + boxH / 2 + 2;
    s += `<rect x="${cx - 42}" y="${cy - 38}" width="84" height="76" rx="16" fill="#2b251d" stroke="#4a4234" stroke-dasharray="4 3"/>`;
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
