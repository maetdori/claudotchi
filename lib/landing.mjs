// landing.mjs — project landing page (출품작 첫 화면). Intro + 설치 + GitHub link,
// with the growth-chart poster embedded and a link out to the full 도감.
//
//   node lib/landing.mjs [outfile]      # default: ./landing.html

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LIFESPAN_PCT } from './chart.mjs';
import { growthSvg } from './growth-svg.mjs';
import { galleryHtml, GALLERY_CSS } from './dogam.mjs';

const REPO = 'https://github.com/maetdori/claudotchi';

const STATS = [
  ['🧠', '지능', '구체적·맥락 있는 좋은 프롬프트'],
  ['⚡', '성실', '꾸준한 상호작용 (긴 방치 X)'],
  ['🧼', '청결', '도구 에러·실패가 적음'],
  ['❤️', '교감', '삐짐 풀어주기 (다정한 말)'],
];
const FEATURES = [
  ['🌳', '정해진 가계도', '성체 12종 + 시크릿 2종. 랜덤이 아니라 케어 스탯이 분기를 결정 — 어떤 캐릭터로 컸는가 = AI를 어떻게 썼는가.'],
  ['⏳', '컨텍스트 = 수명', `컨텍스트 사용률이 곧 나이. 기본 ${LIFESPAN_PCT}%를 한 생애로 보고, 펫만 봐도 내가 얼마나 썼는지 알 수 있어요.`],
  ['🧬', '세션 간 교배', '여러 세션의 펫을 교배해 자손을 만듭니다. genome이 결정적으로 재조합돼 같은 종도 개체가 유니크.'],
  ['😤', '삐짐', '오래 방치하면 삐져서 도구 사용이 막힙니다. 다정한 말("고마워")을 건네면 풀리고 교감이 올라요.'],
];

function html() {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>클로도치 (claudotchi) — AI를 어떻게 쓰는지에 따라 자라는 펫</title>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendard-dynamic-subset.min.css">
<style>
  :root{--bg:#14110e;--panel:#1d1915;--panel2:#241f1a;--ink:#f2e9db;--muted:#a99c89;
    --line:#352d24;--clay:#d77757;--accent:#e8c15c}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#241d16 0,var(--bg) 60%);
    color:var(--ink);font:16px/1.65 "Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  .wrap{max-width:1000px;margin:0 auto;padding:60px 24px 100px}
  a{color:inherit}
  .kicker{font-size:12px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--clay);margin-bottom:18px}
  .kicker .sep{color:var(--line);margin:0 9px}
  h1{font-size:clamp(28px,5vw,44px);font-weight:800;line-height:1.12;letter-spacing:-1px;margin:0 0 18px;color:var(--ink)}
  h1 .dash{color:#7c6e62;font-weight:500}
  h1 .sub{color:#7c6e62}
  .lede{color:#cbbfa9;font-size:17px;line-height:1.7;max-width:620px;margin:0 0 30px}
  .lede b{color:var(--ink)}
  .cta{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:12px;
    font-size:15px;font-weight:700;text-decoration:none;transition:transform .12s ease,filter .12s ease}
  .btn:hover{transform:translateY(-2px)}
  .btn.primary{background:var(--clay);color:#1a120d}
  .btn.primary:hover{filter:brightness(1.07)}
  .btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
  .btn.ghost:hover{border-color:var(--clay)}
  .life{margin:30px 0 0;padding:14px 18px;background:var(--panel);border:1px solid var(--line);
    border-radius:12px;color:var(--muted);font-size:14px;overflow-x:auto;white-space:nowrap}
  h2{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin:64px 0 18px;font-weight:700}
  .features{display:grid;gap:14px;grid-template-columns:1fr}
  @media(min-width:680px){.features{grid-template-columns:1fr 1fr}}
  .feat{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);
    border-radius:16px;padding:20px 22px}
  .feat .ic{font-size:24px}
  .feat h3{margin:8px 0 6px;font-size:17px}
  .feat p{margin:0;color:var(--muted);font-size:14px;line-height:1.6}
  .install{background:#0f0c0a;border:1px solid var(--line);border-radius:14px;padding:20px 22px}
  .install pre{margin:0;overflow-x:auto;font:14px/1.8 ui-monospace,Menlo,monospace;color:#e8e0d0}
  .install .c{color:var(--clay)}
  .install .note{color:var(--muted);font-size:13.5px;margin:14px 0 0}
  .stats{display:flex;flex-wrap:wrap;gap:10px}
  .stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 16px;flex:1 1 200px}
  .stat .n{font-weight:700}.stat .h{color:var(--muted);font-size:13px;margin-top:3px}
  .chart{border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.28)}
  .chart svg{width:100%;height:auto;display:block}
  ${GALLERY_CSS}
  footer{margin-top:70px;padding-top:24px;border-top:1px solid var(--line);color:var(--muted);font-size:13.5px;
    display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center}
  footer a{color:var(--accent);text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="kicker">CLAUDOTCHI<span class="sep">·</span>Claude Code 플러그인</div>
    <h1>클로도치 <span class="dash">—</span> <span class="sub">AI를 쓰는 만큼 자라는 펫</span></h1>
    <p class="lede"><b>좋은 프롬프트를 먹이고, 꾸준히 돌보고, 도구 실수를 줄이면</b> 깔끔하고 귀여운 클로드로 자랍니다. 성의없이 쓰면 다크서클·콧물·수염 자국의 못난 클로드로요. <b>컨텍스트 사용량이 곧 수명</b>이라, 상태표시줄의 펫만 봐도 내가 컨텍스트를 얼마나 썼는지 한눈에 보입니다.</p>
    <div class="cta">
      <a class="btn primary" href="${REPO}" target="_blank" rel="noopener">GitHub에서 보기 ↗</a>
      <a class="btn ghost" href="#dogam">전체 도감 보기 🥚</a>
    </div>
    <div class="life">🥚 알 → 🐣 아기도치 → 🐤 (지능) → 🧒 (성실) → 🧑 성체 12종 + 시크릿 2종 → 💀　(수명 = 컨텍스트 0% → 기본 ${LIFESPAN_PCT}%)</div>
  </header>

  <h2>설치 — 30초면 끝</h2>
  <div class="install">
    <pre><span class="c">/plugin</span> marketplace add ${REPO}.git
<span class="c">/plugin</span> install claudotchi</pre>
    <p class="note">새 세션을 한 번 열면 끝. 상태표시줄은 SessionStart 훅이 <code>~/.claude/settings.json</code>에 자동 등록합니다(기존 statusLine이 있으면 덮어쓰지 않음). 별도 의존성 없이 <b>Node.js</b>만 있으면 동작합니다.</p>
  </div>

  <h2>이렇게 키워요 — 케어 스탯</h2>
  <div class="stats">
    ${STATS.map(([i, n, h]) => `<div class="stat"><div class="n">${i} ${n}</div><div class="h">${h}</div></div>`).join('')}
  </div>

  <h2>무엇이 다른가</h2>
  <div class="features">
    ${FEATURES.map(([ic, t, d]) => `<div class="feat"><div class="ic">${ic}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}
  </div>

  <h2>성장 가계도</h2>
  <div class="chart">${growthSvg()}</div>

  <h2 id="dogam">전체 도감 — 종류별 모습</h2>
  ${galleryHtml()}

  <footer>
    <span>클로도치 · 다마고치 × Claude Code</span>
    <span><a href="${REPO}" target="_blank" rel="noopener">github.com/maetdori/claudotchi</a></span>
  </footer>
</div>
</body>
</html>`;
}

const out = process.argv[2] || fileURLToPath(new URL('../landing.html', import.meta.url));
writeFileSync(out, html());
console.log(`landing written → ${out}`);
