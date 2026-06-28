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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SPRITES, EYE, K, S, W, R, RAINBOW } from './sprites.mjs';
import { NODES, LIFESPAN_PCT, STAGES } from './chart.mjs';
import { growthSvg } from './growth-svg.mjs';

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;

// ── pixel art → HTML grid ──────────────────────────────────────────────────────
// One grid cell == one sprite pixel. In the terminal a pixel is two columns wide
// and one row tall ("roughly square"); on the web we just make each cell square.
// Char → meaning matches sprites.mjs#paintRow exactly.
export function spriteHtml(id, silhouette = false) {
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
        // per-sprite custom palette (🍥 나루토치 y=금발, p=보호대) before transparent.
        default:  cells += spec.pal && spec.pal[ch] ? px(spec.pal[ch]) : '<i class="pp"></i>';
      }
    }
  });
  return `<div class="sprite" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>`;
}
const px = (c) => `<i class="pp" style="background:${rgb(c)}"></i>`;
const eye = (mark) => `<i class="pp eye" style="color:${rgb(EYE)}">${mark}</i>`;

// grade → css class for the gallery chips
export const gradeKey = (g) => ({ S: 's', A: 'a', B: 'b', C: 'c', D: 'd', F: 'f', '★': 'legend' }[g] || 'x');

// ── sprite gallery, grouped by stage (adults ordered cute→ugly = grade desc) ─────
export const GROUPS = [
  { title: '🥚 알 · 유아기', ids: ['egg', 'alklo'] },
  { title: '🐤 성장기', ids: ['ddolttol', 'pyeongbeom', 'malsseong'] },
  { title: '🧒 청년기', ids: ['busy_model', 'relaxed_genius', 'diligent_avg', 'relaxed_avg', 'busy_trouble', 'neglected_trouble'] },
  {
    title: '✨ 성체 12종',
    ids: ['master', 'nerd', 'pro', 'model_citizen', 'basement_genius', 'glutton', 'mypace', 'lazy', 'clown', 'berserk', 'zombie', 'oyaji'],
  },
  {
    title: '🔒 시크릿',
    ids: ['legend', 'nyang', 'narutochi'],
  },
];

// ── 획득 경로 (acquisition path) ────────────────────────────────────────────────
// Reverse-walk the NODES tree so each form's detail panel can show *how you get it*
// — the stat gate at every branch from 알 down to that node. Hidden forms bypass the
// topology (they're deterministic overrides in chooseChild), so their route is spelt
// out to match the gate logic in chart.mjs (isLegend/isNyang/isNarutochiEligible).
const PARENT = {};
for (const [pid, n] of Object.entries(NODES)) {
  if (!n.children) continue;
  for (const [tier, cid] of Object.entries(n.children)) PARENT[cid] = { pid, tier, branchStat: n.branchStat };
}
const STAT_KO = { intel: '🧠 지능', dilig: '⚡ 성실', clean: '🧼 청결' };
const TIER_KO = { high: '상', mid: '중', low: '하' };
const HIDDEN_HOWTO = {
  legend: '완벽 케어로 근면도치→마스터 경로 + 3세대↑ + ❤️ 교감 10↑',
  nyang: '마페도치를 ❤️ 교감 12↑ 로 키우기',
  narutochi: '방치도치를 ⚡ 성실 되돌리기(평균 0.6↑) + ❤️ 교감 10↑',
};
export function acquirePath(id) {
  if (NODES[id]?.hidden) return HIDDEN_HOWTO[id] || '특정 조건에서만 분기';
  const steps = [];
  let cur = id;
  while (PARENT[cur]) {
    const { pid, tier, branchStat } = PARENT[cur];
    if (branchStat) steps.unshift(`${STAT_KO[branchStat]} ${TIER_KO[tier]}`);
    cur = pid;
  }
  return steps.length ? steps.join(' · ') : '시작 형태';
}

// ── 계보 (kin): 부모 + 형제 — for the detail view's related-forms thumbnails ───────
// Normal forms read straight from the tree. Hidden forms are runtime overrides
// (absent from any node's children map), so their origin relatives are spelt out to
// match chooseChild: each hidden form replaces one branch of its base parent, so its
// "siblings" are that parent's ordinary children.
const HIDDEN_KIN = {
  legend: { parent: 'busy_model', siblings: ['master', 'nerd'] },
  nyang: { parent: 'relaxed_avg', siblings: ['mypace', 'lazy'] },
  narutochi: { parent: 'neglected_trouble', siblings: ['zombie', 'oyaji'] },
};
function kinOf(id) {
  if (HIDDEN_KIN[id]) return HIDDEN_KIN[id];
  const p = PARENT[id];
  if (!p) return { parent: null, siblings: [] };
  const kids = NODES[p.pid].children || {};
  const siblings = Object.values(kids).filter((c) => c !== id && c !== '_');
  return { parent: p.pid, siblings };
}

// Per-form payload for the client detail view: raw pixel grid + palette + metadata,
// so the preview / PNG export / silhouette all render from the same source as the
// game. Exported so both the standalone 도감 and the app (index.html) reuse it.
export function formsPayload() {
  const ids = [...new Set(GROUPS.flatMap((g) => g.ids))];
  const forms = {};
  for (const id of ids) {
    const spec = SPRITES[id], n = NODES[id];
    forms[id] = {
      name: n.name, badge: spec.badge || '', grade: n.grade || '', stage: n.stage,
      hidden: !!n.hidden, profile: n.profile || '', howto: acquirePath(id),
      grid: spec.grid, body: spec.body, pal: spec.pal || null, rainbow: !!spec.rainbow,
      kin: kinOf(id),
    };
  }
  return { forms, RAINBOW, EYE, K, S, W, R, SHADOW: [54, 46, 38] };
}

function specimen(id) {
  const n = NODES[id];
  // Hidden forms are shown as a flat silhouette with their name/profile masked —
  // you only learn what they are by actually unlocking them in a run.
  if (n.hidden) {
    return `<figure class="spec secret" data-id="${id}">
      <div class="frame">${spriteHtml(id, true)}</div>
      <figcaption><span class="cname">？？？</span> <span class="grade glegend">★</span></figcaption>
    </figure>`;
  }
  const grade = n.grade ? `<span class="grade g${gradeKey(n.grade)}">${n.grade}급</span>` : '';
  const profile = n.profile ? `<p class="profile">${n.profile}</p>` : '';
  return `<figure class="spec" data-id="${id}">
    <div class="frame">${spriteHtml(id)}</div>
    <figcaption><span class="cname">${n.name}</span> ${grade}${profile}</figcaption>
  </figure>`;
}

// The full sprite gallery (every form, grouped by stage). Exported so the landing
// page (lib/landing.mjs) can inline the same catalog instead of linking out.
export function galleryHtml() {
  return GROUPS.map((g) => `
    <section class="group">
      <h3>${g.title}</h3>
      <div class="grid">${g.ids.map(specimen).join('')}</div>
    </section>`).join('');
}

// Gallery + grade-chip styles, exported so the landing page reuses them verbatim.
export const GALLERY_CSS = `
  .group{margin-top:34px}
  .group h3{font-size:18px;margin:0 0 18px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
  .spec{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:14px;
    padding:14px;text-align:center;transition:transform .15s ease,border-color .15s ease}
  .spec:hover{transform:translateY(-3px);border-color:var(--clay)}
  .spec.secret{border-style:dashed}
  .spec.secret .frame{background:#e3d8c1}
  .spec.secret .cname{color:var(--muted);letter-spacing:.15em}
  /* bright warm checkerboard (display case) — a soft outline on the sprite keeps even
     the cream 알 readable without muddying the background. */
  .frame{position:relative;background:#ece3d1;border-radius:10px;padding:16px 10px;
    display:flex;align-items:center;justify-content:center;min-height:118px;
    background-image:linear-gradient(45deg,#ddd1b8 25%,transparent 25%,transparent 75%,#ddd1b8 75%),
      linear-gradient(45deg,#ddd1b8 25%,transparent 25%,transparent 75%,#ddd1b8 75%);
    background-size:14px 14px;background-position:0 0,7px 7px}
  .badge{position:absolute;top:6px;right:8px;font-size:16px;z-index:1}
  .frame .sprite{filter:drop-shadow(0 0 1px rgba(58,42,28,.6)) drop-shadow(0 2px 2px rgba(58,42,28,.32))}
  .sprite{display:inline-grid;gap:0;image-rendering:pixelated}
  .pp{display:block;width:9px;height:9px}
  .pp.eye{display:flex;align-items:center;justify-content:center;font:700 8px/1 monospace}
  .spec figcaption{margin-top:12px}
  figcaption .cname{font-weight:600}
  .profile{color:var(--muted);font-size:12.5px;margin:6px 0 0;line-height:1.45}
  .grade{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;
    padding:1px 6px;margin-left:5px;vertical-align:middle;color:#14110e}
  .gs{background:#e8c15c}.ga{background:#9fd3a0}.gb{background:#8fc1e3}
  .gc{background:#d9c79a}.gd{background:#e0a07f}.gf{background:#c98c8c}
  .glegend{background:linear-gradient(90deg,#e85a5a,#e8c15c,#6ec878,#64a0e6,#af78d7);color:#14110e}
  .gx{background:#5a4f42;color:#f2e9db}`;

// ── thesvg-style detail view: big framed preview + info panel + custom controls ──
export const DETAIL_CSS = `
  .detail{display:grid;gap:22px;grid-template-columns:1fr;align-items:start}
  @media(min-width:720px){.detail{grid-template-columns:minmax(280px,340px) 1fr;gap:52px}}
  @media(min-width:1040px){.detail{gap:64px}}
  .preview-wrap{display:flex;flex-direction:column;gap:14px}
  .frame.preview{min-height:300px;padding:30px}
  .frame.preview .pp{width:var(--pp,14px);height:var(--pp,14px)}
  .controls{display:flex;flex-direction:column;gap:11px}
  .ctl{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted)}
  .ctl input[type=range]{flex:1;accent-color:var(--clay)}
  .ctl-val{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--accent);min-width:38px;text-align:right}
  .ctl-btns{display:flex;gap:10px}
  .ctl-btns .btn-ctl{flex:1 1 0}
  .btn-ctl{display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;
    background:var(--panel);border:1px solid var(--line);color:var(--ink);border-radius:10px;
    padding:9px 14px;font:600 13px/1 inherit;cursor:pointer;transition:border-color .15s,transform .1s}
  .btn-ctl .dl-ico{width:15px;height:15px;flex:0 0 auto}
  .btn-ctl:hover{border-color:var(--clay);transform:translateY(-1px)}
  .btn-ctl.primary{background:var(--clay);color:#1a120d;border-color:var(--clay)}
  .btn-ctl.on{border-color:var(--clay);color:var(--clay)}
  .info .iname{font-size:25px;font-weight:800;margin:0 0 10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .info .meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
  .info .chip{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:4px 11px;font-size:12.5px;color:var(--muted)}
  .info dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:11px 18px;font-size:14.5px}
  .info dt{color:var(--muted);white-space:nowrap}
  .info dd{margin:0;color:var(--ink);line-height:1.55}
  .info dd.howto{color:var(--accent);font-weight:600}
  .dogam-browse .spec{cursor:pointer}
  .dogam-browse .spec.active{border-color:var(--clay);box-shadow:0 0 0 2px var(--clay) inset}
  .reveal-hint{margin:18px 0 0;font-size:13.5px;color:var(--muted)}
  .reveal-hint b{color:var(--clay)}
  /* pixel-grid overlay (격자) — a faint editor-style lattice over the preview */
  .frame.preview.grid .pp{box-shadow:inset 0 0 0 1px rgba(26,18,12,.32)}
  /* PNG size presets — export an exact NxN icon and sync the preview slider */
  .png-presets{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .png-lbl{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-weight:600;margin-right:2px}
  .png-lbl .dl-ico{width:14px;height:14px}
  .png-sz{background:var(--panel);border:1px solid var(--line);color:var(--ink);border-radius:9px;
    padding:7px 11px;font:600 12.5px/1 ui-monospace,Menlo,monospace;cursor:pointer;transition:border-color .12s,transform .1s,background .12s}
  .png-sz:hover{border-color:var(--clay);transform:translateY(-1px)}
  .png-sz.on{background:var(--clay);color:#1a120d;border-color:var(--clay)}
  /* info-panel sub-sections: palette chips + kin thumbnails */
  .info h4{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:20px 0 10px;font-weight:700}
  .pal{display:flex;flex-wrap:wrap;gap:7px}
  .cchip{display:inline-flex;align-items:center;gap:6px;background:var(--panel);border:1px solid var(--line);border-radius:8px;
    padding:4px 9px 4px 6px;font:600 11.5px/1 ui-monospace,Menlo,monospace;color:var(--muted);cursor:pointer;transition:border-color .12s,color .12s}
  .cchip:hover{border-color:var(--clay);color:var(--ink)}
  .cchip.copied{border-color:var(--accent);color:var(--accent)}
  .cchip i{width:13px;height:13px;border-radius:3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
  .kin-wrap{margin-top:6px}
  .kin-row{display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap}
  .kin-lbl{font-size:11px;color:var(--muted);min-width:30px;font-weight:600}
  .kin{display:inline-flex;flex-direction:column;align-items:center;gap:5px;background:var(--panel);border:1px solid var(--line);
    border-radius:11px;padding:9px 10px 7px;cursor:pointer;transition:transform .1s,border-color .12s;width:76px}
  .kin:hover{transform:translateY(-2px);border-color:var(--clay)}
  .kin-sp{display:grid;place-items:center;min-height:44px}
  .kin-sp .pp{width:4px;height:4px}
  .kin-sp .sprite{filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
  .kin-nm{font-size:11px;color:var(--muted);text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:66px}`;

// Self-contained client script (no network). @@DATA@@ is replaced with a JSON payload
// carrying every form's grid + palette, so the preview/PNG/silhouette all render from
// the same pixel source the game uses. Written without template literals so it can be
// injected into html()'s template literal verbatim.
export const DETAIL_JS = `<script>
(function(){
  var P = @@DATA@@;
  var forms=P.forms, RAINBOW=P.RAINBOW, EYE=P.EYE, K=P.K, S=P.S, W=P.W, R=P.R, SHADOW=P.SHADOW;
  var DOT='\\u00b7';
  var rgb=function(c){ return 'rgb('+c[0]+','+c[1]+','+c[2]+')'; };
  function hex(c){ var h='#'; for(var i=0;i<3;i++){ var s=c[i].toString(16); h+= s.length<2?'0'+s:s; } return h; }
  function resolve(ch,f,ri){
    if(ch==='O') return f.rainbow ? RAINBOW[ri%RAINBOW.length] : f.body;
    if(ch==='e'||ch==='u'||ch==='x') return EYE;
    if(ch==='k') return K; if(ch==='s') return S; if(ch==='w') return W; if(ch==='r') return R;
    if(f.pal && f.pal[ch]) return f.pal[ch];
    return null;
  }
  function cols(f){ return Math.max.apply(null, f.grid.map(function(r){return r.length;})); }
  function cellsHtml(f,sil){
    var n=cols(f), out='';
    f.grid.forEach(function(row,ri){
      var padded=row; while(padded.length<n) padded+=DOT;
      for(var i=0;i<n;i++){
        var ch=padded[i];
        if(ch===DOT||ch===' '){ out+='<i class="pp"></i>'; continue; }
        var c=sil?SHADOW:resolve(ch,f,ri);
        out+= c ? '<i class="pp" style="background:'+rgb(c)+'"></i>' : '<i class="pp"></i>';
      }
    });
    return '<div class="sprite" style="grid-template-columns:repeat('+n+',1fr)">'+out+'</div>';
  }
  // distinct colours this form actually paints with, in first-seen order.
  function palette(f){
    var seen={}, order=[];
    f.grid.forEach(function(row,ri){
      for(var i=0;i<row.length;i++){
        var ch=row[i]; if(ch===DOT||ch===' ') continue;
        var c=resolve(ch,f,ri); if(!c) continue;
        var h=hex(c); if(!seen[h]){ seen[h]=1; order.push(c); }
      }
    });
    return order.slice(0,12);
  }
  // export an exact target×target PNG: integer scale-to-fit, centred, transparent pad.
  function exportPng(target){
    var f=forms[curId]; if(!f) return;
    var s=sil, n=cols(f), rows=f.grid.length, maxDim=Math.max(n,rows);
    var scale=Math.max(1, Math.floor(target/maxDim));
    var cv=document.createElement('canvas'); cv.width=target; cv.height=target;
    var ctx=cv.getContext('2d');
    var offx=Math.floor((target-n*scale)/2), offy=Math.floor((target-rows*scale)/2);
    f.grid.forEach(function(row,ri){
      var padded=row; while(padded.length<n) padded+=DOT;
      for(var i=0;i<n;i++){
        var ch=padded[i]; if(ch===DOT||ch===' ') continue;
        var c=s?SHADOW:resolve(ch,f,ri); if(!c) continue;
        ctx.fillStyle=rgb(c); ctx.fillRect(offx+i*scale, offy+ri*scale, scale, scale);
      }
    });
    var a=document.createElement('a'); a.href=cv.toDataURL('image/png');
    a.download=f.name+'-'+target+'.png'; a.click();
    // sync the preview slider toward the exported scale (visual feedback of the pick).
    var mn=parseInt(sizer.min,10)||3, mx=parseInt(sizer.max,10)||30;
    sizer.value=Math.min(mx, Math.max(mn, scale)); setSize();
  }
  var STAGE_KO={egg:'알',baby:'유아기',child:'성장기',teen:'청년기',adult:'성체'};
  var GRADE_CLS={S:'gs',A:'ga',B:'gb',C:'gc',D:'gd',F:'gf'};
  var preview=document.getElementById('preview'), info=document.getElementById('info'),
      sizer=document.getElementById('sizer'), silBtn=document.getElementById('silBtn'),
      gridBtn=document.getElementById('gridBtn'), sizeVal=document.getElementById('sizeVal'),
      browse=document.querySelector('.dogam-browse'),
      presets=document.querySelectorAll('.png-sz');
  function setSize(){ preview.style.setProperty('--pp', sizer.value+'px'); if(sizeVal) sizeVal.textContent=sizer.value+'px'; }
  var curId=null, sil=false, grid=false;
  // web detail title: always the real name. Secrets are masked only in the gallery
  // grid; clicking one open reveals it here, same as any other form.
  function label(f){ return f.name; }
  function kinThumb(id){
    var g=forms[id]; if(!g) return '';
    var nm=label(g);
    return '<button class="kin" data-kin="'+id+'" title="'+nm+'"><span class="kin-sp">'+cellsHtml(g, g.hidden)+'</span><span class="kin-nm">'+nm+'</span></button>';
  }
  function kinHtml(f){
    var k=f.kin; if(!k) return '';
    var rows='';
    if(k.parent) rows+='<div class="kin-row"><span class="kin-lbl">부모</span>'+kinThumb(k.parent)+'</div>';
    if(k.siblings && k.siblings.length) rows+='<div class="kin-row"><span class="kin-lbl">형제</span>'+k.siblings.map(kinThumb).join('')+'</div>';
    return rows ? '<div class="kin-wrap"><h4>계보</h4>'+rows+'</div>' : '';
  }
  function paletteHtml(f){
    var cs=palette(f); if(!cs.length) return '';
    var chips=cs.map(function(c){ var h=hex(c); return '<button class="cchip" data-hex="'+h+'"><i style="background:'+rgb(c)+'"></i>'+h+'</button>'; }).join('');
    return '<div class="pal-wrap"><h4>팔레트</h4><div class="pal">'+chips+'</div></div>';
  }
  function render(){
    var f=forms[curId]; if(!f) return;
    // secrets stay masked (silhouette + ？？？) until 컬러 보기 flips sil off.
    var masked = f.hidden && sil;
    preview.innerHTML=cellsHtml(f, sil);
    var nm = masked ? '？？？' : label(f);
    var gradeChip = f.grade==='★' ? '<span class="grade glegend">★</span>'
                  : f.grade ? '<span class="grade '+(GRADE_CLS[f.grade]||'gx')+'">'+f.grade+'급</span>' : '';
    var meta = '<div class="meta"><span class="chip">'+(STAGE_KO[f.stage]||f.stage)+'</span>'+
      (f.hidden?'<span class="chip">히든</span>':'')+'</div>';
    var body = masked
      ? meta + '<p class="reveal-hint">🔒 <b>컬러 보기</b>를 누르면 정체가 공개돼요</p>'
      : meta + '<dl><dt>획득 경로</dt><dd class="howto">'+f.howto+'</dd>'+
        '<dt>프로필</dt><dd>'+f.profile+'</dd></dl>'+paletteHtml(f)+kinHtml(f);
    info.innerHTML = '<h3 class="iname">'+nm+' '+gradeChip+'</h3>'+body;
    if(browse){ var cards=browse.querySelectorAll('.spec'); for(var j=0;j<cards.length;j++){ cards[j].classList.toggle('active', cards[j].getAttribute('data-id')===curId); } }
  }
  // secrets open in silhouette (컬러 보기 to reveal); everything else opens in colour.
  function select(id){ if(!forms[id]) return; curId=id; sil=!!forms[id].hidden;
    silBtn.classList.toggle('on', sil); silBtn.textContent = sil?'컬러 보기':'실루엣 보기'; render(); }
  sizer.addEventListener('input', function(){ setSize(); for(var i=0;i<presets.length;i++) presets[i].classList.remove('on'); });
  silBtn.addEventListener('click', function(){ sil=!sil; silBtn.classList.toggle('on',sil); silBtn.textContent = sil?'컬러 보기':'실루엣 보기'; render(); });
  if(gridBtn) gridBtn.addEventListener('click', function(){ grid=!grid; gridBtn.classList.toggle('on',grid); preview.classList.toggle('grid',grid); });
  for(var pi=0;pi<presets.length;pi++){ (function(b){ b.addEventListener('click', function(){ for(var j=0;j<presets.length;j++) presets[j].classList.remove('on'); b.classList.add('on'); exportPng(parseInt(b.getAttribute('data-png'),10)); }); })(presets[pi]); }
  // delegated info-panel clicks: palette chip → copy hex; kin thumbnail → navigate.
  info.addEventListener('click', function(e){
    var chip=e.target.closest('.cchip');
    if(chip){ var h=chip.getAttribute('data-hex'); try{ navigator.clipboard.writeText(h); }catch(_){}
      var old=chip.innerHTML; chip.classList.add('copied');
      chip.innerHTML='<i style="background:'+h+'"></i>복사!';
      setTimeout(function(){ chip.innerHTML=old; chip.classList.remove('copied'); }, 900); return; }
    var kin=e.target.closest('.kin');
    if(kin){ select(kin.getAttribute('data-kin')); document.getElementById('detail').scrollIntoView({behavior:'smooth',block:'center'}); }
  });
  if(browse){ browse.addEventListener('click', function(e){ var s=e.target.closest('.spec'); if(s){ select(s.getAttribute('data-id')); document.getElementById('detail').scrollIntoView({behavior:'smooth',block:'center'}); } }); }
  setSize();
  select('master');
})();
</script>`;

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
  const gallery = galleryHtml();
  const payload = formsPayload();

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>클로도치 도감 · claudotchi catalog</title>
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
  .hero h1{font-size:clamp(28px,5vw,44px);font-weight:800;line-height:1.12;
    letter-spacing:-1px;margin:0 0 22px;color:var(--ink)}
  .hero h1 .dash{color:#7c6e62;font-weight:500}
  .hero h1 .sub{color:#7c6e62}
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

  /* sprite gallery + grade chips (shared with the landing page) */
  ${GALLERY_CSS}

  /* thesvg-style detail view (dogam page only) */
  ${DETAIL_CSS}

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
    <div class="kicker">CLAUDOTCHI<span class="sep">·</span>도감</div>
    <h1>클로도치 도감 <span class="dash">—</span> <span class="sub">잘 키울수록 예쁘게</span></h1>
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
    <p class="lead">나이 = 컨텍스트 사용률. 기본 수명 <b>${LIFESPAN_PCT}%</b> (<span class="mono">/claudotchi:config lifespan &lt;1~100&gt;</span> 으로 조절, 단계는 비례).</p>
    <table><tbody>${stageRows}</tbody></table>
  </div>

  <h2>성장 가계도</h2>
  <div class="chart">${growthSvg()}</div>

  <h2 id="dogam">스프라이트 도감 — 상세</h2>
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

  <h2>전체 — 카드를 누르면 위에서 자세히 봐요</h2>
  <div class="dogam-browse">${gallery}</div>

  <footer>
    <p><code>node lib/dogam.mjs</code> 로 자동 생성 — <code>lib/sprites.mjs</code> · <code>lib/chart.mjs</code> 가 원본 데이터.</p>
  </footer>
</div>
${DETAIL_JS.replace('@@DATA@@', () => JSON.stringify(payload))}
</body>
</html>`;
}

// CLI only when run directly — landing.mjs imports galleryHtml()/GALLERY_CSS and
// must not trigger a dogam.html write (or hijack its argv) on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2] || fileURLToPath(new URL('../dogam.html', import.meta.url));
  writeFileSync(out, html());
  console.log(`도감 written → ${out}`);
}
