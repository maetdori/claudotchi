// banner.mjs — render the README hero banner as a flat SVG (no gradients).
//
// GitHub Markdown can't carry CSS/JS or the truecolor pixel art of the status line,
// so the hero is a real image (SVG = crisp at any zoom, tiny, diff-able). It ships
// its own flat colours, so it reads the same on GitHub's light and dark themes.
//
// Composition mirrors the site's main view: a warm cream page dotted with a faint
// grid, a mascot + 클로도치 wordmark, and a terminal mockup showing the actual status
// line (prompt · pixel pet · 이름/가문/세대 · lifespan bar · stats) — "이렇게 생김"
// at a glance. Mascot and mockup share one pet, 성실도치(diligent_avg), a 청년기 form.
//
//   node lib/banner.mjs [outfile]   # default: ./assets/banner.svg

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SPRITES, EYE, K, S, W, R, RAINBOW } from './sprites.mjs';

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ── palette (flat) ────────────────────────────────────────────────────────────
const PAPER = '#f4ecd9';  // warm cream page
const DOT = '#c9b489';    // faint dot-grid
const INK = '#2b2016';    // dark wordmark on the light page
const SUB = '#8a7b64';    // muted brown (tagline)
const CLAY = '#c0552d';   // warm accent (deepened for the light page)
// terminal mockup — lifted straight from the site's .term styles (app.mjs)
const SCREEN = '#0d0b09', BAR = '#241e18', BAR_LINE = '#33291f', RING = 'rgba(215,119,87,.5)';
const T_BODY = '#d9cfbf', T_PROMPT = '#8a8f98', T_PATH = '#c9bfb0', T_GIT = '#6ec878';
const T_CLAY = '#d77757', T_MUTED = '#a99c89', GOLD = '#e8c15c';

const WIDTH = 1200, HEIGHT = 496;
const MONO = "ui-monospace, SFMono-Regular, Menlo, 'Apple SD Gothic Neo', monospace";
const SANS = "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Segoe UI', system-ui, sans-serif";

// ── sprite → svg pixels; top-left at (ox, oy), pixel size px ─────────────────────
function spriteSvg(spec, ox, oy, px) {
  let out = '';
  spec.grid.forEach((row, ri) => {
    [...row].forEach((ch, ci) => {
      if (ch === '·' || ch === ' ') return;
      const col = ch === 'O' ? (spec.rainbow ? RAINBOW[ri % RAINBOW.length] : spec.body)
        : ch === 'k' ? K : ch === 's' ? S : ch === 'w' ? W : ch === 'r' ? R
        : (spec.pal && spec.pal[ch]) ? spec.pal[ch] : EYE;
      out += `<rect x="${ox + ci * px}" y="${oy + ri * px}" width="${px}" height="${px}" fill="${rgb(col)}"/>`;
    });
  });
  return out;
}

export function bannerSvg() {
  const pet = SPRITES.diligent_avg; // 성실도치 · 청년기
  const defs = `<defs>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.3" fill="${DOT}" opacity="0.5"/>
    </pattern>
  </defs>`;

  let s = '';
  s += `<rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}"/>`;
  s += `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dots)"/>`;

  // ── header: mascot + wordmark + tagline ────────────────────────────────────────
  const HX = 60;
  s += spriteSvg(pet, HX, 40, 11); // mascot (5×5 grid → 55×55)
  s += `<text x="${HX + 76}" y="92" font-size="56" font-weight="800" fill="${INK}" font-family="${SANS}" letter-spacing="1">클로도치</text>`;
  s += `<text x="${HX + 78}" y="122" font-size="17" font-weight="600" fill="${CLAY}" font-family="${MONO}" letter-spacing="6">claudotchi</text>`;
  s += `<text x="${HX}" y="168" font-size="18" fill="${INK}" font-family="${SANS}">당신이 AI를 <tspan fill="${CLAY}" font-weight="700">어떻게 쓰는지</tspan>에 따라 자라는 Claude Code 펫 — 컨텍스트 사용량이 곧 수명이에요.</text>`;

  // ── terminal mockup (mirrors app.mjs .term) ─────────────────────────────────────
  const TX = 60, TY = 196, TW = WIDTH - 120, BARH = 44;
  const cardH = 244;
  s += `<rect x="${TX}" y="${TY}" width="${TW}" height="${cardH}" rx="14" fill="${SCREEN}" stroke="${RING}" stroke-width="1"/>`;
  // title bar
  s += `<path d="M${TX} ${TY + 14} a14 14 0 0 1 14 -14 h${TW - 28} a14 14 0 0 1 14 14 v${BARH - 14} h${-TW} z" fill="${BAR}"/>`;
  s += `<line x1="${TX}" y1="${TY + BARH}" x2="${TX + TW}" y2="${TY + BARH}" stroke="${BAR_LINE}"/>`;
  const dY = TY + BARH / 2;
  ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((c, i) => { s += `<circle cx="${TX + 22 + i * 20}" cy="${dY}" r="6" fill="${c}"/>`; });
  s += `<text x="${TX + TW / 2}" y="${dY + 4}" font-size="13" fill="${T_MUTED}" font-family="${MONO}" text-anchor="middle">claudotchi — zsh</text>`;

  // body
  const bx = TX + 24;
  // prompt line
  let px = bx; const pY = TY + BARH + 34;
  const seg = (t, fill, weight) => {
    const chunk = `<tspan fill="${fill}"${weight ? ` font-weight="${weight}"` : ''}>${esc(t)}</tspan>`;
    return chunk;
  };
  s += `<text x="${bx}" y="${pY}" font-size="13.5" font-family="${MONO}">`
    + seg('maetdori ', T_PROMPT) + seg('~/source/playground/claudotchi', T_PATH) + seg(' ', T_PROMPT)
    + seg('(main)', T_GIT) + seg(' Opus 4.8 (1M context) ', T_PROMPT) + seg('ctx:31%', T_CLAY, 700) + seg(' 5h:8%', T_PROMPT)
    + `</text>`;

  // pixel pet
  const petY = pY + 24;
  s += spriteSvg(pet, bx + 2, petY, 9); // 5×5 → 45×45

  // id line: 이름 · 가문 · 세대
  const idY = petY + 45 + 30;
  s += `<text x="${bx}" y="${idY}" font-size="15" font-family="${MONO}">`
    + `<tspan fill="${T_CLAY}" font-weight="700">성실도치</tspan>`
    + `<tspan fill="${T_MUTED}" font-size="13">  · 🏠 하이쿠家 · 1세대</tspan>`
    + `</text>`;

  // lifespan bar + stats
  const lY = idY + 30, barW = 150, barH = 9, barX = bx, ratio = 0.775;
  s += `<rect x="${barX}" y="${lY - barH + 1}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="rgba(255,255,255,.09)"/>`;
  s += `<rect x="${barX}" y="${lY - barH + 1}" width="${barW * ratio}" height="${barH}" rx="${barH / 2}" fill="${GOLD}"/>`;
  s += `<text x="${barX + barW + 14}" y="${lY}" font-size="13.5" fill="${T_MUTED}" font-family="${MONO}">`
    + `31% / 40% 청년기      🧠 지능 5    ⚡️ 성실 6    🧼 청결 21    ❤️ 교감 0`
    + `</text>`;

  // caption below the card — the site's joke footer, faint on the page
  s += `<text x="${WIDTH / 2}" y="${TY + cardH + 31}" font-size="13.5" fill="${SUB}" font-family="${SANS}" text-anchor="middle" letter-spacing="0.5">클로도치무료분양연락주세요01034788515</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="클로도치 claudotchi — 컨텍스트 사용량에 따라 자라는 Claude Code 펫">${defs}${s}</svg>`;
}

// run directly to (re)generate the asset.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const out = process.argv[2] || fileURLToPath(new URL('../assets/banner.svg', import.meta.url));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, bannerSvg());
  console.error(`wrote ${out}`);
}
