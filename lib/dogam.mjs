// dogam.mjs — generate the 클로도치 도감 as a self-contained HTML page.
//
// The Markdown 도감 (DOGAM.md) can only fake the sprites in black-and-white ASCII.
// This renders the *real* pixel art in truecolor, straight from the same data the
// status line uses (SPRITES grids + per-node palette, NODES topology), so the page
// never drifts from the game. Output is one standalone .html file — no assets, no
// build step, no network — i.e. exactly what a Claude artifact is under the hood.
//
//   node lib/dogam.mjs [outfile]      # default: ./dogam.html

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SPRITES, EYE, K, S, W, R, RAINBOW } from './sprites.mjs';
import { NODES, LIFESPAN_PCT, STAGES } from './chart.mjs';
import { growthSvg } from './growth-svg.mjs';

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;

// ── pixel art → HTML grid ──────────────────────────────────────────────────────
// One grid cell == one sprite pixel. In the terminal a pixel is two columns wide
// and one row tall ("roughly square"); on the web we just make each cell square.
// Char → meaning matches sprites.mjs#paintRow exactly.
function spriteHtml(id, silhouette = false) {
  const spec = SPRITES[id];
  const body = spec.body;
  const cols = Math.max(...spec.grid.map((r) => r.length));
  let cells = '';
  spec.grid.forEach((row, ri) => {
    const padded = row.padEnd(cols, '·');
    for (const ch of padded) {
      const bodyCol = spec.rainbow ? RAINBOW[ri % RAINBOW.length] : body;
      // 시크릿: every solid pixel collapses to one flat shadow colour — shape only.
      if (silhouette) { cells += ch === '·' || ch === ' ' ? '<i class="pp"></i>' : px([54, 46, 38]); continue; }
      switch (ch) {
        case 'O': cells += px(bodyCol); break;
        case 'e': cells += px(EYE); break;
        case 'k': cells += px(K); break;
        case 's': cells += px(S); break;
        case 'w': cells += px(W); break;
        case 'r': cells += px(R); break;
        case 'u': cells += eye('–'); break; // sleepy / droopy
        case 'x': cells += eye('×'); break; // passed-out
        default:  cells += '<i class="pp"></i>'; // transparent
      }
    }
  });
  return `<div class="sprite" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>`;
}
const px = (c) => `<i class="pp" style="background:${rgb(c)}"></i>`;
const eye = (mark) => `<i class="pp eye" style="color:${rgb(EYE)}">${mark}</i>`;

// grade → css class for the gallery chips
const gradeKey = (g) => ({ S: 's', A: 'a', B: 'b', C: 'c', D: 'd', F: 'f', '★': 'legend' }[g] || 'x');

// ── sprite gallery, grouped by stage (adults ordered cute→ugly = grade desc) ─────
const GROUPS = [
  { title: '🥚 알 · 유아기', ids: ['egg', 'alklo'] },
  { title: '🐤 성장기', ids: ['ddolttol', 'pyeongbeom', 'malsseong'] },
  { title: '🧒 청년기', ids: ['busy_model', 'relaxed_genius', 'diligent_avg', 'relaxed_avg', 'busy_trouble', 'neglected_trouble'] },
  {
    title: '✨ 성체 12종 — 잘 키울수록 위, 못 키울수록 아래',
    ids: ['master', 'nerd', 'pro', 'model_citizen', 'basement_genius', 'glutton', 'mypace', 'lazy', 'clown', 'berserk', 'zombie', 'oyaji'],
  },
  {
    title: '🔒 시크릿 — 실루엣만 공개',
    ids: ['legend', 'nyang'],
  },
];

function specimen(id) {
  const n = NODES[id];
  // Hidden forms are shown as a flat silhouette with their name/profile masked —
  // you only learn what they are by actually unlocking them in a run.
  if (n.hidden) {
    return `<figure class="spec secret">
      <div class="frame">${spriteHtml(id, true)}</div>
      <figcaption><span class="cname">❔ ？？？</span> <span class="grade glegend">★</span>
        <p class="profile">🔒 시크릿 — 특정 조건에서만 등장</p></figcaption>
    </figure>`;
  }
  const badge = SPRITES[id]?.badge ? `<span class="badge">${SPRITES[id].badge}</span>` : '';
  const grade = n.grade ? `<span class="grade g${gradeKey(n.grade)}">${n.grade}급</span>` : '';
  const profile = n.profile ? `<p class="profile">${n.profile}</p>` : '';
  return `<figure class="spec">
    <div class="frame">${badge}${spriteHtml(id)}</div>
    <figcaption><span class="cname">${n.name}</span> ${grade}${profile}</figcaption>
  </figure>`;
}

// ── stages table ────────────────────────────────────────────────────────────────
const STAGE_KO = { egg: '알', baby: '유아기', child: '성장기', teen: '청년기', adult: '성체', dead: '죽음' };
const stageRows = STAGES.map((s) =>
  `<tr><td>${STAGE_KO[s.id]} <span class="mono">${s.id}</span></td><td class="num">${+s.min.toFixed(1)}%</td></tr>`
).join('');

const STATS = [
  ['🧠', '지능', '구체적·맥락 있는 좋은 프롬프트'],
  ['⚡️', '성실', '꾸준한 상호작용(긴 방치 X)'],
  ['🧼', '청결', '도구 에러·실패가 적음'],
  ['⭐', '순발', '(보조·휴면) 반응 챌린지 제거됨'],
  ['❤️', '교감', '(보조) 삐짐 풀어주기 — 다정한 말'],
];
const statRows = STATS.map(([i, n, h]) => `<tr><td class="ico">${i}</td><td>${n}</td><td class="hint">${h}</td></tr>`).join('');

const HOUSES = ['클로드家', '오퍼스家', '소네트家', '하이쿠家', '페이블家', '다오家'];

// ── page ─────────────────────────────────────────────────────────────────────────
function html() {
  const gallery = GROUPS.map((g) => `
    <section class="group">
      <h3>${g.title}</h3>
      <div class="grid">${g.ids.map(specimen).join('')}</div>
    </section>`).join('');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>클로도치 도감 · claudochi catalog</title>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendard-dynamic-subset.min.css">
<style>
  :root{
    --bg:#14110e; --panel:#1d1915; --panel2:#241f1a; --ink:#f2e9db; --muted:#a99c89;
    --line:#352d24; --clay:#d77757; --accent:#e8c15c; --cream:#eee4cd;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#241d16 0,var(--bg) 60%);
    color:var(--ink);font:16px/1.6 "Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  .wrap{max-width:1040px;margin:0 auto;padding:56px 24px 96px}
  header.hero{margin:8px 0 52px}
  .kicker{font-size:12px;font-weight:700;letter-spacing:.32em;text-transform:uppercase;
    color:var(--clay);margin-bottom:18px}
  .kicker .sep{color:var(--line);margin:0 9px}
  .hero h1{font-size:clamp(36px,6vw,56px);font-weight:800;line-height:1.04;
    letter-spacing:-1.5px;margin:0 0 22px;color:var(--ink)}
  .hero h1 .dash{color:var(--clay);font-weight:800}
  .desc{color:#cbbfa9;font-size:15.5px;line-height:1.72;max-width:680px;margin:0}
  .desc b{color:var(--ink);font-weight:700}
  h2{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);
    margin:56px 0 16px;font-weight:600}
  h3{font-size:18px;margin:0 0 18px}
  .card{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);
    border-radius:16px;padding:22px 24px;box-shadow:0 1px 0 rgba(255,255,255,.02) inset}
  .cols{display:grid;gap:18px}
  @media(min-width:760px){.cols.two{grid-template-columns:1fr 1fr}}
  table{width:100%;border-collapse:collapse;font-size:15px}
  td{padding:8px 6px;border-top:1px solid var(--line);vertical-align:top}
  tr:first-child td{border-top:0}
  td.ico{font-size:18px;width:34px}
  td.num,.num{text-align:right;color:var(--accent);font-variant-numeric:tabular-nums}
  td.hint,.hint{color:var(--muted);font-size:14px}
  .mono{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--muted)}
  .houses{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
  .house{background:var(--panel);border:1px solid var(--line);border-radius:10px;
    padding:6px 14px;font-size:15px}
  .lead{color:var(--muted);font-size:14.5px;margin:0 0 14px}

  /* sprite gallery */
  .group{margin-top:34px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
  .spec{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:14px;
    padding:14px;text-align:center;transition:transform .15s ease,border-color .15s ease}
  .spec:hover{transform:translateY(-3px);border-color:var(--clay)}
  .spec.secret{border-style:dashed}
  .spec.secret .frame{background:#d9cdb6}
  .spec.secret .cname{color:var(--muted);letter-spacing:.15em}
  .frame{position:relative;background:#efe6d4;border-radius:10px;padding:16px 10px;
    display:flex;align-items:center;justify-content:center;min-height:118px;
    background-image:linear-gradient(45deg,#e7dcc6 25%,transparent 25%,transparent 75%,#e7dcc6 75%),
      linear-gradient(45deg,#e7dcc6 25%,transparent 25%,transparent 75%,#e7dcc6 75%);
    background-size:14px 14px;background-position:0 0,7px 7px}
  .badge{position:absolute;top:6px;right:8px;font-size:16px}
  .sprite{display:inline-grid;gap:0;image-rendering:pixelated}
  .pp{display:block;width:9px;height:9px}
  .pp.eye{display:flex;align-items:center;justify-content:center;font:700 8px/1 monospace}
  figcaption .cname{font-weight:600}
  .profile{color:var(--muted);font-size:12.5px;margin:6px 0 0;line-height:1.45}

  /* grade chips */
  .grade{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;
    padding:1px 6px;margin-left:5px;vertical-align:middle;color:#14110e}
  .gs{background:#e8c15c}.ga{background:#9fd3a0}.gb{background:#8fc1e3}
  .gc{background:#d9c79a}.gd{background:#e0a07f}.gf{background:#c98c8c}
  .glegend{background:linear-gradient(90deg,#e85a5a,#e8c15c,#6ec878,#64a0e6,#af78d7);color:#14110e}
  .gx{background:#5a4f42;color:#f2e9db}

  /* growth-chart poster (inline SVG, shared with the README image) */
  .chart{border:1px solid var(--line);border-radius:18px;overflow:hidden;
    box-shadow:0 8px 30px rgba(0,0,0,.28)}
  .chart svg{width:100%;height:auto;display:block}
  footer{margin-top:64px;text-align:center;color:var(--muted);font-size:13px}
  footer code{color:var(--accent)}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="kicker">CLAUDOCHI<span class="sep">·</span>도감</div>
    <h1>클로도치 도감 <span class="dash">—</span> 잘 키울수록 예쁘게</h1>
    <p class="desc"><b>등급이 곧 외모입니다.</b> AI를 잘 쓰면 깔끔하고 귀여운 클로드로, 성의없이 쓰면 다크서클·콧물·수염 자국에 구부정한 못난 클로드로 자랍니다.</p>
  </header>

  <h2>스탯</h2>
  <div class="cols two">
    <div class="card"><table><tbody>${statRows}</tbody></table></div>
    <div class="card">
      <p class="lead">클로드 모델 혈통으로 이어지는 <b>가문(家)</b>. genome으로 상속되며, 교배 시 부모 가문이 재조합됩니다(드물게 새 가문 변이).</p>
      <div class="houses">${HOUSES.map((h) => `<span class="house">${h}</span>`).join('')}</div>
    </div>
  </div>

  <h2>수명 &amp; 단계</h2>
  <div class="card">
    <p class="lead">나이 = 컨텍스트 사용률. 기본 수명 <b>${LIFESPAN_PCT}%</b> (env <span class="mono">CLAUDOCHI_LIFESPAN</span> 으로 1~100 조절, 단계는 비례).</p>
    <table><tbody>${stageRows}</tbody></table>
  </div>

  <h2>성장 가계도</h2>
  <div class="chart">${growthSvg()}</div>

  <h2>스프라이트 도감</h2>
  ${gallery}

  <footer>
    <p><code>node lib/dogam.mjs</code> 로 자동 생성 — <code>lib/sprites.mjs</code> · <code>lib/chart.mjs</code> 가 원본 데이터.</p>
  </footer>
</div>
</body>
</html>`;
}

const out = process.argv[2] || fileURLToPath(new URL('../dogam.html', import.meta.url));
writeFileSync(out, html());
console.log(`도감 written → ${out}`);
