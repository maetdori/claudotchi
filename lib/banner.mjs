// banner.mjs — render the README hero assets as flat SVGs (no gradients).
//
// Rather than one big combined banner image (which reads as an ad banner on a
// GitHub README), the hero is assembled in Markdown: a real ## header with a small
// mascot icon, then a terminal-mockup image + caption. This file emits the two
// images the README references:
//   assets/icon.svg      — the mascot pixel pet, for the header (transparent bg)
//   assets/terminal.svg  — the status-line terminal mockup card
// Both pull their pixels straight from sprites.mjs so they never drift from the game.
// The mockup mirrors the site's .term styles (app.mjs); pet = 성실도치(diligent_avg),
// a 청년기 form, matching the "31% / 40% 청년기" line.
//
//   node lib/banner.mjs   # writes both assets

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SPRITES, EYE, K, S, W, R, RAINBOW } from './sprites.mjs';

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const MONO = "ui-monospace, SFMono-Regular, Menlo, 'Apple SD Gothic Neo', monospace";
// terminal mockup — 바다남색 sea-navy screen (VS Code-ish) with a clay ring accent.
// Lifted lighter than Night Owl's true #011627 so the whole card reads clearly navy
// on GitHub (at 1× the near-black original looked black next to the lighter title bar).
const SCREEN = '#0c2942', BAR = '#14385a', BAR_LINE = '#1f4a70', RING = 'rgba(215,119,87,.55)';
const T_PROMPT = '#8a8f98', T_PATH = '#c9bfb0', T_GIT = '#6ec878';
const T_CLAY = '#d77757', T_MUTED = '#a99c89', GOLD = '#e8c15c';

const PET = 'diligent_avg'; // 성실도치 · 청년기

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

// mascot icon — the pet on a transparent field, tight viewBox (header use).
export function iconSvg() {
  const spec = SPRITES[PET];
  const cols = Math.max(...spec.grid.map((r) => r.length)), rows = spec.grid.length, px = 8;
  const w = cols * px, h = rows * px;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="클로도치 마스코트">${spriteSvg(spec, 0, 0, px)}</svg>`;
}

// terminal mockup — the status line in a macOS-style window, on transparent bg.
export function terminalSvg() {
  const W = 900, BARH = 44, H = 244;
  const seg = (t, fill, weight) => `<tspan fill="${fill}"${weight ? ` font-weight="${weight}"` : ''}>${esc(t)}</tspan>`;
  let s = '';
  // card + title bar
  s += `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${SCREEN}" stroke="${RING}" stroke-width="1"/>`;
  s += `<path d="M1 15 a14 14 0 0 1 14 -14 h${W - 30} a14 14 0 0 1 14 14 v${BARH - 15} h${-(W - 2)} z" fill="${BAR}"/>`;
  s += `<line x1="1" y1="${BARH}" x2="${W - 1}" y2="${BARH}" stroke="${BAR_LINE}"/>`;
  ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((c, i) => { s += `<circle cx="${23 + i * 20}" cy="${BARH / 2}" r="6" fill="${c}"/>`; });
  s += `<text x="${W / 2}" y="${BARH / 2 + 4}" font-size="13" fill="${T_MUTED}" font-family="${MONO}" text-anchor="middle">claudotchi — zsh</text>`;

  const bx = 24, pY = BARH + 34;
  s += `<text x="${bx}" y="${pY}" font-size="13.5" font-family="${MONO}">`
    + seg('maetdori ', T_PROMPT) + seg('~/source/playground/claudotchi', T_PATH) + seg(' ', T_PROMPT)
    + seg('(main)', T_GIT) + seg(' Opus 4.8 (1M context) ', T_PROMPT) + seg('ctx:31%', T_CLAY, 700) + seg(' 5h:8%', T_PROMPT)
    + `</text>`;

  const petY = pY + 24;
  s += spriteSvg(SPRITES[PET], bx + 2, petY, 9);

  const idY = petY + 45 + 30;
  s += `<text x="${bx}" y="${idY}" font-size="15" font-family="${MONO}">`
    + `<tspan fill="${T_CLAY}" font-weight="700">성실도치</tspan>`
    + `<tspan fill="${T_MUTED}" font-size="13">  · 🏠 하이쿠家 · 1세대</tspan></text>`;

  const lY = idY + 30, barW = 150, barH = 9;
  s += `<rect x="${bx}" y="${lY - barH + 1}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="rgba(255,255,255,.09)"/>`;
  s += `<rect x="${bx}" y="${lY - barH + 1}" width="${barW * 0.775}" height="${barH}" rx="${barH / 2}" fill="${GOLD}"/>`;
  s += `<text x="${bx + barW + 14}" y="${lY}" font-size="13.5" fill="${T_MUTED}" font-family="${MONO}">`
    + `31% / 40% 청년기      🧠 지능 5    ⚡️ 성실 6    🧼 청결 21    ❤️ 교감 0</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="클로도치 상태표시줄 예시">${s}</svg>`;
}

// run directly to (re)generate both assets.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const dir = fileURLToPath(new URL('../assets/', import.meta.url));
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + 'icon.svg', iconSvg());
  writeFileSync(dir + 'terminal.svg', terminalSvg());
  console.error(`wrote ${dir}icon.svg + terminal.svg`);
}
