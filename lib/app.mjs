// app.mjs — the 클로도치 single-page app (사이드바: 메인 / 가이드 / 도감 / 컬렉션).
// One self-contained index.html served at the GitHub Pages root. Reuses the real
// game data (sprites.mjs · chart.mjs) and the 도감 detail view from dogam.mjs, so the
// page never drifts from the plugin.
//
//   node lib/app.mjs [outfile]      # default: ./index.html

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SPRITES, EYE, K, S, W, R, RAINBOW } from './sprites.mjs';
import { NODES, LIFESPAN_PCT } from './chart.mjs';
import { growthSvg } from './growth-svg.mjs';
import {
  spriteHtml, GROUPS, galleryHtml, GALLERY_CSS, DETAIL_CSS, DETAIL_JS, formsPayload,
} from './dogam.mjs';

const REPO = 'https://github.com/maetdori/claudotchi';

// A pixel-sprite favicon built from the same SPRITES source as the statusline /
// collection art — inline data: URI so it needs no extra file and survives the
// strict Pages CSP. Default: 성실도치(diligent_avg).
function spriteFavicon(id) {
  const spec = SPRITES[id];
  const grid = spec.grid;
  const body = spec.body || [215, 119, 87];
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const PAL = { O: body, e: EYE, k: K, s: S, w: W, r: R };
  const cols = Math.max(...grid.map((r) => r.length));
  const rows = grid.length;
  let px = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const col = PAL[grid[y][x]];
      if (col) px += `<rect x="${x}" y="${y}" width="1" height="1" fill="${rgb(col)}"/>`;
    }
  }
  // 배경 타일 없이 투명 — 스프라이트 픽셀만.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" shape-rendering="crispEdges">${px}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
const FAVICON = spriteFavicon('diligent_avg');

// real Claude Code logo (inline), official orange #D97757 — from claude-code.svg
const ICON = '<svg viewBox="0 0 24 24" role="img" aria-label="Claude Code"><path clip-rule="evenodd" '
  + 'd="M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z" '
  + 'fill="#D97757" fill-rule="evenodd"/></svg>';

// ── 메인: 터미널 상태표시줄 목업 (image #16 스타일) ───────────────────────────────
function terminalMock() {
  return `<div class="term">
    <div class="term-bar"><i class="r"></i><i class="y"></i><i class="g"></i><span class="tt">claudotchi — zsh</span></div>
    <div class="term-body">
      <div class="term-prompt">maetdori <span class="path">~/source/playground/claudotchi</span> <span class="git">(main)</span> Opus 4.8 (1M context) <span class="ctx">ctx:31%</span> 5h:8%</div>
      ${spriteHtml('diligent_avg')}
      <div class="term-idline"><span class="tn">성실도치</span> <span class="tm">· 🏠 하이쿠家 · 1세대</span></div>
      <div class="term-life"><span class="pbar"><span class="pfill"></span></span>31% / 40% 청년기　　🧠 지능 5　⚡ 성실 6　🧼 청결 21　❤️ 교감 0</div>
    </div>
  </div>
  <p class="term-cap">클로도치무료분양연락주세요01012345678</p>`;
}

// ── 메인: 생애주기 스트립 ─────────────────────────────────────────────────────────
// real pixel sprites all the way down (one true path: 알→아기→평범→성실→모범→묘비).
const LIFE = [
  ['egg', '알 · 0%'], ['alklo', '유아기'], ['pyeongbeom', '성장기'],
  ['diligent_avg', '청년기'], ['model_citizen', '성체'], ['grave', `죽음 · ${LIFESPAN_PCT}%`],
];
function lifeStrip() {
  return `<div class="life-strip">${LIFE.map(([id, l], i) =>
    `${i ? '<span class="arr">→</span>' : ''}<span class="lnode"><span class="bub sp-${id}">${spriteHtml(id)}</span><span class="lb">${l}</span></span>`
  ).join('')}</div>`;
}

// ── 컬렉션북 데이터 (성체 12 + 히든 3) ───────────────────────────────────────────
function collectibles() {
  const ids = Object.keys(NODES).filter((id) => NODES[id].stage === 'adult');
  return ids.map((id) => ({
    id, name: NODES[id].name, grade: NODES[id].grade || '★',
    svg: spriteHtml(id), sil: spriteHtml(id, true),
  }));
}

// ── views ─────────────────────────────────────────────────────────────────────────
const MAIN = `
  <div class="view-head">
    <h1><span class="titleico">${ICON}</span> 클로도치</h1>
    <p>Claude Code 상태표시줄에서 나만의 클로도치를 키워보아요</p>
  </div>
  ${terminalMock()}
  <div class="prose main-prose">
    <p>펫은 컨텍스트를 쓸수록 나이를 먹어요. 기본 수명은 <strong>${LIFESPAN_PCT}%<sup class="fn-mark">*</sup></strong> — 알에서 성체까지 자라다, 다 쓰면 묘비를 남기고 다음 세대로 이어집니다. <strong>어떤 모습으로 컸는가 = 내가 AI를 어떻게 썼는가.</strong></p>
    <p class="footnote"><span class="fn-mark">*</span> 왜 ${LIFESPAN_PCT}%일까요 — 컨텍스트를 다 쓰기 전에 <b>세션을 정리하라는 신호</b>예요. 후반부로 갈수록 응답 품질이 떨어지니, ${LIFESPAN_PCT}%쯤에서 한 생을 마치게 두면 컨텍스트가 늘 넉넉하게 유지돼요. 수명은 <code>/claudotchi:config lifespan &lt;1~100&gt;</code> 으로 조절할 수 있고(단계 경계도 비례), 오래 붙잡는 작업이면 늘리면 됩니다.</p>
  </div>
  ${lifeStrip()}
  <div class="main-cta">
    <a class="btn primary" href="${REPO}" target="_blank" rel="noopener">GitHub에서 보기 ↗</a>
    <button class="btn ghost" id="to-install" type="button">설치 방법 보기 →</button>
  </div>
`;

const GUIDE = `
  <div class="view-head"><p class="eyebrow">guide</p><h1>가이드</h1><p>설치부터 키우는 법까지, 순서대로 따라오세요.</p></div>
  <div class="prose">
    <h2 id="install-sec"><span class="step">1</span> 설치 &amp; 설정</h2>
    <p>플러그인 마켓플레이스에서 <strong>두 줄, 30초</strong>면 끝. 추가 의존성 없이 Node.js만 있으면 돼요.</p>
    <p class="code-cap">💬 <strong>Claude Code(CLI)</strong>를 실행한 뒤 아래 슬래시 명령을 입력하세요</p>
    <pre><code><span class="kw">/plugin</span> marketplace add ${REPO}.git
<span class="kw">/plugin</span> install claudotchi</code></pre>
    <p>새 세션을 한 번 열면 상태표시줄이 자동 등록돼요(기존 statusLine이 있으면 덮어쓰지 않음<sup class="fn-mark">*</sup>).<br>설정은 <code>/claudotchi:setup</code> 으로 한 번에, 또는 <code>/claudotchi:config</code> 로 언제든 바꿔요.</p>
    <details class="note">
      <summary>이미 다른 상태표시줄이 있어서 펫이 안 보인다면</summary>
      <p>플러그인은 기존 <code>statusLine</code>을 덮어쓰지 않아요. Claude Code에서 아래 명령만 실행하면 진단 후 <strong>교체 / 합치기</strong>를 골라 자동으로 고쳐줘요(수정 전 <code>settings.json</code> 자동 백업, <code>/claudotchi:statusline&nbsp;revert</code> 로 복구):</p>
      <pre><code><span class="kw">/claudotchi:statusline</span></code></pre>
      <details class="sub">
        <summary>또는 직접 <code>settings.json</code> 고치기 (수동)</summary>
        <p><strong>① 펫으로 교체</strong> — <code>statusLine.command</code> 를 펫 스크립트로:</p>
        <pre><code>"statusLine": {
  "type": "command",
  "command": "node \\"~/.claude/plugins/marketplaces/&lt;마켓플레이스&gt;/statusline/claudotchi.mjs\\"",
  "padding": 0, "refreshInterval": 3000
}</code></pre>
        <p><strong>② 기존 것과 함께 쓰기</strong> — 같은 입력(JSON)을 둘에 흘려 출력을 합치는 래퍼를 만들고(예: <code>~/.claude/claudotchi-combined.sh</code>), 그걸 <code>statusLine.command</code>(<code>bash …/claudotchi-combined.sh</code>)로 지정:</p>
        <pre><code>#!/usr/bin/env bash
input=$(cat)
PET="$HOME/.claude/plugins/marketplaces/&lt;마켓플레이스&gt;/statusline/claudotchi.mjs"
mine=$(printf '%s' "$input" | &lt;기존 statusLine 명령&gt;)
pet=$(printf '%s' "$input" | node "$PET")
printf '%s\\n%s\\n' "$mine" "$pet"</code></pre>
        <p class="note-tip">경로의 <code>&lt;마켓플레이스&gt;</code> 는 설치 방식에 따라 달라요 — <code>~/.claude/plugins/marketplaces/</code> 아래에서 확인하세요.</p>
      </details>
    </details>

    <h2><span class="step">2</span> 이렇게 키워요 — 케어 스탯</h2>
    <p>이제 새 펫이 알에서 태어나요. 자라는 동안 쌓은 네 스탯이 매 단계 갈림길에서 다음 모습을 정해요.</p>
    <table><thead><tr><th>스탯</th><th>올리는 법</th></tr></thead><tbody>
      <tr><td>🧠 <strong>지능</strong></td><td>구체적·맥락 있는 프롬프트 (파일·경로, 코드, 목표)</td></tr>
      <tr><td>⚡ <strong>성실</strong></td><td>꾸준한 상호작용 (긴 방치는 감점)</td></tr>
      <tr><td>🧼 <strong>청결</strong></td><td>도구 에러·실패가 적음</td></tr>
      <tr><td>❤️ <strong>교감</strong></td><td>삐진 펫 달래주기 — 히든 분기의 열쇠</td></tr>
    </tbody></table>

    <h2><span class="step">3</span> 성장 가계도</h2>
    <p>성장기 <strong>🧠</strong> → 청년기 <strong>⚡</strong> → 성체 <strong>🧼</strong> 순으로 갈라져 12종의 성체(+히든 3종)가 됩니다.<br><strong>경로 의존적</strong>이라, 초반에 게으르면 나중에 잘해도 최상위 마스터도치엔 닿지 못해요.</p>
  </div>
  <figure class="chart-full">
    <div class="chart" role="button" tabindex="0" title="클릭하면 크게 볼 수 있어요">${growthSvg()}</div>
  </figure>
  <div class="prose">
    <button class="tree-cta" data-view="dogam" type="button">📖 전체 도감 펼쳐보기 — 성체 12종 + 히든 3종 <span class="ar">→</span></button>
    <p>캐릭터별 프로필·획득 경로는 <strong>도감</strong>, 내가 모은 펫은 <strong>컬렉션</strong>에서 확인하세요.</p>

    <h2><span class="step">4</span> 대 잇기 &amp; 삐짐</h2>
    <ul>
      <li><strong>🧬 교배</strong> — 다른 세션 펫과 <code>/claudotchi:breed</code> 하면 자손 알이 태어나요. 가문(클로드·오퍼스·소네트·하이쿠·페이블·다오)이 상속됩니다.</li>
      <li><strong>🪦 족보</strong> — <code>/claudotchi:family</code> 로 역대 세대 묘비와 지금 살아있는 펫(가계도)을 한눈에 봐요.</li>
      <li><strong>😤 삐짐</strong> — 오래 방치하면 삐져서 도구가 막혀요. 다정한 말 한마디면 풀리고 ❤️교감이 올라요. 부담되면 <code>/claudotchi:sulk off</code> 로 끌 수 있어요.</li>
    </ul>
  </div>
`;

const DOGAM = `
  <div class="view-head"><p class="eyebrow">encyclopedia</p><h1>도감</h1></div>
  <section class="detail" id="detail">
    <div class="preview-wrap">
      <div class="frame preview" id="preview"></div>
      <div class="controls">
        <label class="ctl">크기 <input type="range" id="sizer" min="3" max="30" value="14"> <span class="ctl-val" id="sizeVal"></span></label>
        <div class="ctl-btns">
          <button class="btn-ctl" id="silBtn">실루엣 보기</button>
          <button class="btn-ctl" id="gridBtn">격자</button>
        </div>
        <div class="png-presets">
          <span class="png-lbl"><svg class="dl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10"/><path d="M8 11l4 4 4-4"/><path d="M5 20h14"/></svg>PNG 저장</span>
          <button class="png-sz" data-png="32">32</button>
          <button class="png-sz" data-png="64">64</button>
          <button class="png-sz" data-png="128">128</button>
          <button class="png-sz" data-png="256">256</button>
        </div>
      </div>
    </div>
    <div class="info" id="info"></div>
  </section>
  <div class="dogam-browse">${galleryHtml()}</div>
`;

const COLL = `
  <div class="view-head"><p class="eyebrow">collection</p><h1>컬렉션북</h1></div>
  <div class="progress"><div class="pbar"><div class="pfill" id="pfill"></div></div><p class="plabel" id="plabel"></p></div>
  <p class="coll-hint">카드를 눌러 획득/해제할 수 있어요. 터미널에서 <b>/claudotchi:collection</b>을 실행하면 내 실제 컬렉션으로 이 페이지가 자동으로 채워지는 링크를 받을 수 있어요.</p>
  <div class="coll-grid" id="collgrid"></div>
`;

// ── client JS: 컬렉션 + 뷰 전환 (도감 상세는 DETAIL_JS 재사용) ──────────────────────
const COLL_JS = `<script>
(function(){
  var COLL = @@COLL@@;
  var SEED = ['nerd','model_citizen','glutton','mypace','lazy','oyaji','pro'];
  function load(){ try{ var s=localStorage.getItem('cc-owned'); if(s) return new Set(JSON.parse(s)); }catch(e){} return new Set(SEED); }
  var owned = load();
  function save(){ try{ localStorage.setItem('cc-owned', JSON.stringify(Array.from(owned))); }catch(e){} }
  var grid=document.getElementById('collgrid'), pfill=document.getElementById('pfill'), plabel=document.getElementById('plabel');
  function render(){
    grid.innerHTML='';
    COLL.forEach(function(f){
      var has=owned.has(f.id);
      var c=document.createElement('div'); c.className='cc'+(has?'':' locked'); c.setAttribute('data-id',f.id);
      c.innerHTML='<span class="cc-grade">'+f.grade+'</span>'+(has?'<span class="cc-chk">\\u2713</span>':'')
        +'<span class="cc-sp">'+(has?f.svg:f.sil)+'</span><span class="cc-nm">'+(has?f.name:'\\uff1f\\uff1f\\uff1f')+'</span>';
      grid.appendChild(c);
    });
    var n=COLL.filter(function(f){return owned.has(f.id);}).length, t=COLL.length;
    pfill.style.width=(n/t*100)+'%';
    plabel.innerHTML='<b>'+n+'</b> / '+t+' \\uc218\\uc9d1 \\u00b7 '+Math.round(n/t*100)+'%';
  }
  grid.addEventListener('click', function(e){ var c=e.target.closest('.cc'); if(!c) return; var id=c.getAttribute('data-id'); owned.has(id)?owned.delete(id):owned.add(id); save(); render(); });
  // Import an owned-set shared from the plugin (/claudotchi:collection): #coll=nerd,pro,…
  var imported=0;
  (function(){
    var m=(location.hash+' '+location.search).match(/coll=([a-z_,]+)/i);
    if(!m) return;
    var valid={}; COLL.forEach(function(f){ valid[f.id]=1; });
    var next=m[1].split(',').filter(function(x){ return valid[x]; });
    if(!next.length) return;
    owned=new Set(next); save(); imported=next.length;
    try{ localStorage.setItem('cc-view','coll'); }catch(e){}
    // Drop the #coll= hash so later manual toggles aren't overwritten on refresh.
    try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
  })();
  render();
  if(imported){
    var head=document.querySelector('#v-coll .view-head');
    if(head && !head.querySelector('.coll-import')){
      var note=document.createElement('p'); note.className='coll-import';
      note.textContent='🔗 내 세션에서 불러온 컬렉션 · '+imported+'종';
      head.appendChild(note);
    }
  }
})();
</script>`;

const VIEW_JS = `<script>
(function(){
  var views=['main','guide','dogam','coll'];
  function show(v){
    views.forEach(function(k){ var el=document.getElementById('v-'+k); if(el) el.classList.toggle('active', k===v); });
    var btns=document.querySelectorAll('.navbtn'); for(var i=0;i<btns.length;i++) btns[i].classList.toggle('active', btns[i].getAttribute('data-view')===v);
    try{ localStorage.setItem('cc-view', v); }catch(e){}
    window.scrollTo(0,0);
  }
  var btns=document.querySelectorAll('[data-view]'); for(var i=0;i<btns.length;i++){ (function(b){ b.addEventListener('click', function(){ show(b.getAttribute('data-view')); }); })(btns[i]); }
  var ib=document.getElementById('to-install');
  if(ib) ib.addEventListener('click', function(){ show('guide'); var el=document.getElementById('install-sec'); if(el) el.scrollIntoView({behavior:'smooth'}); });
  var start; try{ start=localStorage.getItem('cc-view'); }catch(e){}
  show(start && views.indexOf(start)>=0 ? start : 'main');
})();
</script>`;

// 성장 가계도 라이트박스 — 인라인 차트를 클릭하면 전체화면으로 clone해 드래그 팬 + 휠/버튼 줌.
// SVG는 벡터라 확대해도 픽셀아트가 또렷. 원본을 cloneNode 하므로 마크업에 SVG를 중복 넣지 않음.
const LB_JS = `<script>
(function(){
  var lb=document.getElementById('lb'), stage=document.getElementById('lb-stage');
  if(!lb||!stage) return;
  var svg=null, scale=1, minS=0.2, maxS=8, tx=0, ty=0, vbw=0, vbh=0;
  function apply(){ if(svg) svg.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')'; }
  function fit(){
    var r=stage.getBoundingClientRect();
    scale=Math.min(r.width/vbw, r.height/vbh)*0.96; minS=scale*0.5;
    tx=(r.width-vbw*scale)/2; ty=(r.height-vbh*scale)/2; apply();
  }
  function open(){
    var src=document.querySelector('.chart svg'); if(!src) return;
    if(!svg){ svg=src.cloneNode(true); stage.appendChild(svg); }
    var vb=src.viewBox.baseVal; vbw=vb.width; vbh=vb.height;
    svg.setAttribute('width',vbw); svg.setAttribute('height',vbh);
    lb.hidden=false; lb.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
    fit();
  }
  function close(){ lb.hidden=true; lb.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  function zoomAt(f,cx,cy){ var ns=Math.max(minS,Math.min(maxS,scale*f)); tx=cx-(cx-tx)*(ns/scale); ty=cy-(cy-ty)*(ns/scale); scale=ns; apply(); }
  function ctr(){ var r=stage.getBoundingClientRect(); return [r.width/2,r.height/2]; }
  var chart=document.querySelector('.chart');
  if(chart){
    chart.addEventListener('click',open);
    chart.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
  }
  document.getElementById('lb-close').addEventListener('click',close);
  document.getElementById('lb-in').addEventListener('click',function(){ var c=ctr(); zoomAt(1.25,c[0],c[1]); });
  document.getElementById('lb-out').addEventListener('click',function(){ var c=ctr(); zoomAt(0.8,c[0],c[1]); });
  document.getElementById('lb-fit').addEventListener('click',fit);
  lb.addEventListener('click',function(e){ if(e.target===lb) close(); });
  document.addEventListener('keydown',function(e){ if(!lb.hidden && e.key==='Escape') close(); });
  stage.addEventListener('wheel',function(e){ e.preventDefault(); var r=stage.getBoundingClientRect(); zoomAt(e.deltaY<0?1.12:0.89, e.clientX-r.left, e.clientY-r.top); }, {passive:false});
  var drag=false, px=0, py=0;
  stage.addEventListener('pointerdown',function(e){ drag=true; px=e.clientX; py=e.clientY; stage.classList.add('dragging'); try{stage.setPointerCapture(e.pointerId);}catch(_){} });
  stage.addEventListener('pointermove',function(e){ if(!drag) return; tx+=e.clientX-px; ty+=e.clientY-py; px=e.clientX; py=e.clientY; apply(); });
  function end(){ drag=false; stage.classList.remove('dragging'); }
  stage.addEventListener('pointerup',end); stage.addEventListener('pointercancel',end);
  window.addEventListener('resize',function(){ if(!lb.hidden) fit(); });
})();
</script>`;

// 코드블록마다 복사 버튼 — 각 .prose pre 를 .codeblock 으로 감싸고 버튼을 붙인다.
// clipboard API(https)를 우선, 실패/불가 시 textarea+execCommand 폴백.
const COPY_JS = `<script>
(function(){
  var ICO='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  var CHK='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';
  var pres=document.querySelectorAll('.prose pre');
  for(var i=0;i<pres.length;i++){(function(pre){
    var wrap=document.createElement('div'); wrap.className='codeblock';
    pre.parentNode.insertBefore(wrap,pre); wrap.appendChild(pre);
    var btn=document.createElement('button'); btn.type='button'; btn.className='copybtn';
    btn.innerHTML=ICO; btn.title='복사'; btn.setAttribute('aria-label','코드 복사');
    function ok(){ btn.innerHTML=CHK; btn.classList.add('copied'); btn.title='복사됨';
      setTimeout(function(){ btn.innerHTML=ICO; btn.classList.remove('copied'); btn.title='복사'; },1400); }
    function fallback(t){ var ta=document.createElement('textarea'); ta.value=t;
      ta.style.position='fixed'; ta.style.top='-9999px'; document.body.appendChild(ta); ta.focus(); ta.select();
      try{ document.execCommand('copy'); ok(); }catch(e){} document.body.removeChild(ta); }
    btn.addEventListener('click',function(){
      var code=pre.querySelector('code'); var text=(code||pre).innerText.replace(/\\n$/,'');
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(ok,function(){fallback(text);}); }
      else fallback(text);
    });
    wrap.appendChild(btn);
  })(pres[i]);}
})();
</script>`;

function html() {
  const detailJs = DETAIL_JS.replace('@@DATA@@', () => JSON.stringify(formsPayload()));
  const collJs = COLL_JS.replace('@@COLL@@', () => JSON.stringify(collectibles()));

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14110e">
<link rel="icon" type="image/svg+xml" href="${FAVICON}">
<title>클로도치 (claudotchi) — AI를 쓰는 만큼 자라는 펫</title>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendard-dynamic-subset.min.css">
<style>
  :root{
    --bg:#14110e; --panel:#1d1915; --panel2:#241f1a; --ink:#f2e9db; --muted:#a99c89;
    --line:#352d24; --clay:#d77757; --accent:#e8c15c;
    color-scheme:dark;
  }
  *{box-sizing:border-box}
  /* iOS Safari: 루트/오버스크롤·상태바·툴바 영역까지 어두운 배경으로 (상하단 흰 띠 제거) */
  html{scroll-behavior:smooth;background:var(--bg)}
  body{margin:0;background:radial-gradient(1100px 560px at 18% -8%,#241d16 0,var(--bg) 58%);
    color:var(--ink);font:16px/1.6 "Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;
    /* 한글은 어절(띄어쓰기) 단위로만 줄바꿈 — 단어 중간에서 끊기지 않게. 긴 토큰만 예외적으로 분해. */
    word-break:keep-all;overflow-wrap:break-word}
  a{color:inherit}

  /* ── app shell ── */
  /* 모바일 트랙은 minmax(0,1fr) — 그냥 1fr(=minmax(auto,1fr))은 자식 min-content가
     트랙을 뷰포트 밖으로 밀어내(가로 오버플로·첫 로드 확대) 반드시 0-최소로 둔다 */
  .app{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr)}
  @media(min-width:900px){.app{grid-template-columns:242px minmax(0,1fr);align-items:start}}
  /* iOS: 세이프에어리어(상단 상태바)까지 헤더 배경으로 칠해 흰 띠 제거 */
  .sidebar{position:sticky;top:0;z-index:40;background:rgba(20,17,14,.9);backdrop-filter:saturate(180%) blur(10px);border-bottom:1px solid var(--line);padding-top:env(safe-area-inset-top)}
  @media(min-width:900px){.sidebar{height:100vh;border-bottom:0;border-right:1px solid var(--line);display:flex;flex-direction:column;padding-top:0}}
  .sb-brand{display:flex;align-items:center;gap:.5em;font-weight:800;padding:22px 22px 18px;font-size:1.05rem;color:var(--ink)}
  .sb-brand .cc-ico{width:1.15em;height:1.15em;display:inline-flex;flex:0 0 auto}.sb-brand .cc-ico svg{width:100%;height:100%;display:block}
  .sb-brand .hl{color:var(--clay)}
  .sb-nav{display:flex;gap:6px;padding:0 12px 12px;overflow-x:auto}
  @media(min-width:900px){.sb-nav{flex-direction:column;padding:6px 14px;gap:4px;overflow:visible}}
  .navbtn{appearance:none;font:inherit;cursor:pointer;text-align:left;background:none;border:0;color:var(--muted);
    padding:11px 15px;border-radius:11px;display:flex;align-items:center;gap:11px;font-weight:600;white-space:nowrap;transition:background .12s,color .12s}
  @media(min-width:900px){.navbtn{width:100%}}
  .navbtn:hover{background:var(--panel);color:var(--ink)}
  .navbtn.active{background:rgba(215,119,87,.15);color:var(--clay)}
  .navbtn .ic{font-size:1.05rem;line-height:1}
  .sb-foot{display:none}
  @media(min-width:900px){.sb-foot{display:block;margin-top:auto;padding:16px 22px;border-top:1px solid var(--line);font-size:.8rem;color:var(--muted)}}
  .sb-foot a{color:var(--accent);text-decoration:none}
  /* 모바일 가로 오버플로(첫 로드 확대) 방지: 콘텐츠 컬럼의 어떤 자식도 뷰포트 밖으로
     페이지를 넓히지 못하게 클립(세로 흐름은 유지 — hidden은 세로 스크롤을 깨므로 clip 사용) */
  .content{padding:8px 34px 84px;min-width:0;overflow-x:clip}
  @media(max-width:640px){.content{padding:8px 20px 64px}}
  .view{display:none}.view.active{display:block}
  .view-head{padding:36px 0 8px}
  .view-head .eyebrow{font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--clay)}
  .view-head h1{font-size:clamp(1.7rem,3.4vw,2.25rem);font-weight:800;margin:14px 0 0;letter-spacing:-.02em;color:var(--ink);display:flex;align-items:center;gap:.4em}
  .view-head h1 .titleico{display:inline-flex;width:1.2em;height:1.2em;flex:0 0 auto}.view-head h1 .titleico svg{width:100%;height:100%;display:block}
  .view-head p{margin-top:12px;color:#cbbfa9;font-size:1.02rem;max-width:640px;line-height:1.65}
  .view-head p b{color:var(--ink)}

  /* ── buttons ── */
  .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 19px;border-radius:12px;font-family:inherit;font-weight:700;font-size:15px;line-height:1;
    text-decoration:none;cursor:pointer;border:1px solid transparent;transition:transform .12s,filter .12s,border-color .12s}
  .btn:hover{transform:translateY(-2px)}
  .btn.primary{background:var(--clay);color:#1a120d}
  .btn.ghost{background:transparent;color:var(--ink);border-color:var(--line)}
  .btn.ghost:hover{border-color:var(--clay)}
  .main-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}

  /* ── 메인: 터미널 목업 ── */
  /* deep terminal screen + lighter title bar + faint clay ring/glow — reads clearly
     as a terminal window against the dark page, on-brand via the clay accent */
  .term{background:#0d0b09;border:1px solid rgba(215,119,87,.38);border-radius:14px;overflow:hidden;
    box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 34px rgba(215,119,87,.05);max-width:760px;margin-top:26px}
  .term-bar{display:flex;align-items:center;gap:8px;padding:11px 14px;background:#241e18;border-bottom:1px solid #33291f;position:relative}
  .term-bar i{width:12px;height:12px;border-radius:50%;display:block}
  .term-bar .r{background:#ff5f56}.term-bar .y{background:#ffbd2e}.term-bar .g{background:#27c93f}
  .term-bar .tt{position:absolute;left:0;right:0;text-align:center;font:12px ui-monospace,Menlo,monospace;color:var(--muted)}
  .term-body{padding:18px 20px 20px;font:13px/1.7 ui-monospace,Menlo,monospace;color:#d9cfbf}
  .term-prompt{color:#8a8f98;font-size:12px;margin-bottom:16px;word-break:break-all}
  .term-prompt .path{color:#c9bfb0}.term-prompt .git{color:#6ec878}.term-prompt .ctx{color:var(--clay);font-weight:700}
  .term .sprite{--tz:11px}.term .sprite .pp{width:var(--tz);height:var(--tz)}
  .term-idline{margin-top:16px;font-size:14px;word-break:keep-all}
  .term-idline .tn{color:var(--clay);font-weight:700}
  .term-idline .tm{color:var(--muted);font-size:12.5px}
  .term-life{color:var(--muted);font-size:12.5px;margin-top:12px;letter-spacing:.02em;
    white-space:nowrap;overflow-x:auto;scrollbar-width:none}
  .term-life::-webkit-scrollbar{display:none}
  /* rounded pill progress bar (gold fill on a faint track) — 31%/40% ≈ 77.5% filled */
  .term-life .pbar{display:inline-block;vertical-align:middle;width:148px;height:9px;border-radius:999px;
    background:rgba(255,255,255,.09);overflow:hidden;margin-right:11px}
  .term-life .pfill{display:block;width:77.5%;height:100%;border-radius:999px;background:linear-gradient(90deg,#e8c15c,#d9a441)}
  .term-cap{text-align:center;color:var(--clay);opacity:.92;font-size:13.5px;font-weight:700;letter-spacing:.01em;margin-top:12px;max-width:760px;overflow-wrap:anywhere}
  .main-prose{margin-top:24px}
  .fn-mark{color:var(--clay);font-weight:700}
  .main-prose .footnote{font-size:12.5px;color:var(--muted);line-height:1.65;margin:12px 0 0;padding-left:14px;border-left:2px solid var(--line);max-width:720px}
  .main-prose .footnote b{color:#cbbfa9}

  /* ── 메인: 생애주기 스트립 ── */
  .life-strip{display:flex;align-items:center;gap:8px;margin:24px 0 0;padding:20px 22px;background:var(--panel);
    border:1px solid var(--line);border-radius:16px;overflow-x:auto;max-width:760px}
  .life-strip .lnode{display:flex;flex-direction:column;align-items:center;gap:9px;flex:1 1 0;min-width:0}
  /* light cream tile so the sprites' near-black detail pixels (eyes/mouth) read —
     a dark bub would swallow them (same reason the 도감 frames are light) */
  .life-strip .bub{width:50px;height:50px;border-radius:50%;background:#ece3d1;border:1px solid #e0d4bd;display:grid;place-items:center;font-size:23px}
  .life-strip .bub .sprite{filter:drop-shadow(0 1px 1px rgba(58,42,28,.3))}
  /* 알은 크림색 몸체라 크림 타일에 묻혀버림 — 알 노드만 짙은 껍질색 1px 아웃라인을
     둘러 실루엣이 배경에서 또렷하게 떨어지게 한다 (다른 단계는 대비가 충분) */
  .life-strip .bub.sp-egg .sprite{filter:drop-shadow(1px 0 0 #a98d55) drop-shadow(-1px 0 0 #a98d55) drop-shadow(0 1px 0 #a98d55) drop-shadow(0 -1px 0 #a98d55)}
  .life-strip .bub .sprite .pp{width:5px;height:5px}
  .life-strip .lb{font-size:11.5px;color:var(--muted);white-space:nowrap}
  .life-strip .arr{color:var(--line);flex:0 0 auto;font-size:14px}

  /* ── 가이드: prose ── */
  .prose{max-width:760px}
  .prose p{color:#cbbfa9;line-height:1.75;margin:0 0 16px}
  .prose p strong,.prose li strong,.prose td strong{color:var(--ink)}
  /* 의미 단위(구)를 한 덩어리로 묶어 줄바꿈이 구 중간을 가르지 않게 (prose는 760px 고정폭이라 안전) */
  .nb{white-space:nowrap}
  .prose h2{font-size:16px;letter-spacing:.02em;color:var(--ink);margin:40px 0 14px;font-weight:700;display:flex;align-items:center}
  .prose h2 .step{display:inline-grid;place-items:center;width:1.55em;height:1.55em;margin-right:.6em;border-radius:8px;
    background:var(--clay);color:#1a120d;font-size:.82em;font-weight:800;flex:0 0 auto}
  .prose h2:first-child{margin-top:8px}
  .prose table{width:100%;border-collapse:collapse;font-size:14.5px;margin:4px 0 8px}
  .prose th{text-align:left;color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.08em;padding:8px 6px;border-bottom:1px solid var(--line)}
  .prose td{padding:11px 6px;border-top:1px solid var(--line);color:#cbbfa9;vertical-align:top}
  .prose td:first-child{white-space:nowrap;width:120px}
  .prose .code-cap{font-size:12.5px;color:var(--muted);margin:0 0 8px;display:flex;align-items:center;gap:6px}
  .prose .code-cap strong{color:var(--clay)}
  .prose .note{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:13px 18px;margin:0 0 16px}
  .prose .note summary{cursor:pointer;font-weight:700;color:var(--ink);font-size:14px;list-style:none}
  .prose .note summary::-webkit-details-marker{display:none}
  .prose .note summary::before{content:'▸';color:var(--clay);margin-right:8px;display:inline-block}
  .prose .note[open] summary::before{content:'▾'}
  .prose .note p{margin:12px 0 8px;font-size:13.5px}
  .prose .note pre{margin:0 0 10px;font-size:12.5px}
  .prose .note-tip{color:var(--muted);font-size:12.5px}
  /* nested manual method — subdued, collapsed by default */
  .prose .note .sub{background:transparent;border:0;border-radius:0;padding:0;margin:6px 0 0}
  .prose .note .sub summary{font-size:13px;font-weight:600;color:var(--muted)}
  .prose .note .sub summary::before{content:'▸';color:var(--muted);margin-right:7px}
  .prose .note .sub[open] summary::before{content:'▾'}
  .prose .note .sub > p:first-of-type{margin-top:12px}
  .prose pre{background:#0f0c0a;border:1px solid var(--line);border-radius:12px;padding:18px 20px;overflow-x:auto;
    font:13.5px/1.8 ui-monospace,Menlo,monospace;color:#e8e0d0;margin:0 0 14px}
  .prose pre .kw{color:var(--clay)}
  /* 코드블록 복사 버튼 (JS가 각 <pre>를 .codeblock으로 감싸고 버튼을 붙임) */
  .codeblock{position:relative}
  .copybtn{position:absolute;top:8px;right:8px;z-index:2;display:inline-flex;align-items:center;justify-content:center;
    color:var(--muted);background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:6px;cursor:pointer;
    transition:border-color .12s,color .12s,background .12s}
  .copybtn svg{display:block}
  .copybtn:hover{border-color:var(--clay);color:var(--ink)}
  .copybtn.copied{border-color:var(--clay);color:var(--clay);background:rgba(215,119,87,.12)}
  .prose code{font-family:ui-monospace,Menlo,monospace;font-size:.88em;color:var(--accent);background:var(--panel);padding:1px 6px;border-radius:5px}
  .prose pre code{background:none;color:inherit;padding:0;font-size:1em}
  .prose ul{margin:0 0 16px;padding:0;list-style:none}
  .prose li{color:#cbbfa9;line-height:1.7;margin:0 0 11px;padding-left:18px;position:relative}
  .prose li::before{content:'·';position:absolute;left:5px;color:var(--clay);font-weight:700}
  .chart-full{margin:14px 0 6px}
  .chart{border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.28);cursor:zoom-in;transition:box-shadow .15s,border-color .15s}
  .chart:hover{border-color:rgba(215,119,87,.5);box-shadow:0 8px 34px rgba(0,0,0,.34),0 0 0 3px rgba(215,119,87,.12)}
  .chart svg{width:100%;height:auto;display:block}
  /* growth-chart lightbox (fullscreen zoom/pan) — ID-scoped so it can't collide with
     the life-strip's <span class="lb"> stage labels (which black out the page if they
     inherit this fixed full-screen overlay). */
  #lb[hidden]{display:none}
  #lb{position:fixed;inset:0;z-index:100;background:rgba(10,8,6,.93);backdrop-filter:saturate(140%) blur(6px);display:flex;flex-direction:column}
  .lb-bar{display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:14px 16px}
  .lb-btn{width:42px;height:42px;border-radius:11px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font-family:inherit;font-weight:600;font-size:19px;line-height:1;cursor:pointer;display:grid;place-items:center;transition:background .12s}
  .lb-btn:hover{background:#2a2219}
  .lb-x{margin-left:10px}
  .lb-stage{flex:1;overflow:hidden;position:relative;touch-action:none;cursor:grab}
  .lb-stage.dragging{cursor:grabbing}
  .lb-stage svg{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;max-width:none}
  .lb-hint{text-align:center;color:var(--muted);font-size:12.5px;padding:10px 12px 16px}
  .tree-cta{display:flex;align-items:center;gap:8px;width:100%;max-width:760px;margin:0 0 16px;padding:14px 18px;
    background:var(--panel);border:1px solid var(--line);border-radius:12px;color:var(--ink);
    font-family:inherit;font-weight:600;font-size:14.5px;line-height:1.3;cursor:pointer;text-align:left;transition:border-color .12s,background .12s}
  .tree-cta:hover{border-color:var(--clay);background:var(--panel2)}
  .tree-cta .ar{margin-left:auto;color:var(--clay);font-weight:800;font-size:16px}

  /* ── 도감: 갤러리 + 상세 뷰 (dogam.mjs와 공유) ── */
  ${GALLERY_CSS}
  ${DETAIL_CSS}
  .group{margin-top:26px}

  /* ── 컬렉션북 ── */
  .coll-import{margin-top:10px;font-size:13.5px;font-weight:700;color:var(--clay)}
  .progress{margin:22px 0 4px;max-width:520px}
  .pbar{height:11px;border-radius:999px;background:var(--panel);border:1px solid var(--line);overflow:hidden}
  .pfill{height:100%;background:var(--clay);width:0;transition:width .35s}
  .plabel{margin-top:11px;font-size:14px;color:var(--muted)}
  .plabel b{color:var(--accent)}
  .coll-hint{font-size:13px;color:var(--muted);margin:12px 0 20px;padding:9px 13px;background:var(--panel);border:1px solid var(--line);border-radius:9px;display:inline-block}
  .coll-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(112px,1fr))}
  .cc{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 8px 12px;text-align:center;cursor:pointer;transition:transform .1s,border-color .1s}
  .cc:hover{transform:translateY(-2px);border-color:var(--clay)}
  .cc-sp{display:grid;place-items:center;min-height:66px}
  .cc-sp .sprite{--cz:7px}.cc-sp .pp{width:var(--cz);height:var(--cz)}
  .cc.locked .cc-sp{opacity:.9}
  .cc-nm{display:block;font-size:13px;font-weight:600;margin-top:9px}
  .cc.locked .cc-nm{color:var(--muted);letter-spacing:.1em}
  .cc-grade{position:absolute;top:8px;left:10px;font-size:11px;font-weight:800;color:var(--muted)}
  .cc-chk{position:absolute;top:7px;right:9px;width:18px;height:18px;border-radius:50%;background:var(--clay);color:#1a120d;display:grid;place-items:center;font-size:11px;font-weight:800}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="sb-brand"><span class="cc-ico">${ICON}</span><span class="wm"><span class="hl">CLAUD</span>OTCHI</span></div>
    <nav class="sb-nav">
      <button class="navbtn" data-view="main"><span class="ic">🏠</span>메인</button>
      <button class="navbtn" data-view="guide"><span class="ic">📘</span>가이드</button>
      <button class="navbtn" data-view="dogam"><span class="ic">📖</span>도감</button>
      <button class="navbtn" data-view="coll"><span class="ic">🏅</span>컬렉션</button>
    </nav>
    <div class="sb-foot"><a href="${REPO}" target="_blank" rel="noopener">GitHub ↗</a> · maetdori.log</div>
  </aside>
  <main class="content">
    <section class="view" id="v-main">${MAIN}</section>
    <section class="view" id="v-guide">${GUIDE}</section>
    <section class="view" id="v-dogam">${DOGAM}</section>
    <section class="view" id="v-coll">${COLL}</section>
  </main>
</div>
<div class="lb" id="lb" hidden aria-hidden="true">
  <div class="lb-bar">
    <button class="lb-btn" id="lb-out" type="button" aria-label="축소">−</button>
    <button class="lb-btn" id="lb-in" type="button" aria-label="확대">+</button>
    <button class="lb-btn" id="lb-fit" type="button" aria-label="화면에 맞추기" title="화면에 맞추기">⤢</button>
    <button class="lb-btn lb-x" id="lb-close" type="button" aria-label="닫기">✕</button>
  </div>
  <div class="lb-stage" id="lb-stage"></div>
  <div class="lb-hint">드래그로 이동 · 휠 또는 ＋－ 로 확대 · Esc 로 닫기</div>
</div>
${detailJs}
${collJs}
${VIEW_JS}
${LB_JS}
${COPY_JS}
</body>
</html>`;
}

const out = process.argv[2] || fileURLToPath(new URL('../index.html', import.meta.url));
writeFileSync(out, html());
console.log(`app written → ${out}`);
