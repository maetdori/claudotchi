// dogam.mjs — the 클로도치 도감 renderer, shared with the web SPA.
//
// Renders the *real* pixel art in truecolor (not the ASCII of DOGAM.md), straight
// from the same data the status line uses (SPRITES grids + per-node palette, NODES
// topology), so it never drifts from the game. This module is a library: the SPA
// (lib/app.mjs) imports galleryHtml()/GALLERY_CSS/DETAIL_CSS/DETAIL_JS/formsPayload
// to inline the same catalog + detail view. (The old standalone dogam.html generator
// was dropped once the SPA subsumed it.)

import { SPRITES, EYE, K, S, W, R, RAINBOW } from './sprites.mjs';
import { NODES } from './chart.mjs';

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

// The full sprite gallery (every form, grouped by stage). Exported so the SPA
// (lib/app.mjs) can inline the same catalog.
export function galleryHtml() {
  return GROUPS.map((g) => `
    <section class="group">
      <h3>${g.title}</h3>
      <div class="grid">${g.ids.map(specimen).join('')}</div>
    </section>`).join('');
}

// Gallery + grade-chip styles, exported so the SPA reuses them verbatim.
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
  .ctl input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;
    background:var(--line);outline:none;margin:0;cursor:pointer}
  .ctl input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:transparent}
  .ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;margin-top:-5px;
    border-radius:50%;background:var(--clay);border:2px solid var(--panel2);box-shadow:0 1px 3px rgba(0,0,0,.45)}
  .ctl input[type=range]::-moz-range-track{height:6px;border-radius:999px;background:var(--line)}
  .ctl input[type=range]::-moz-range-progress{height:6px;border-radius:999px;background:var(--clay)}
  .ctl input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--clay);border:2px solid var(--panel2)}
  .ctl-val{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--accent);min-width:38px;text-align:right}
  .ctl-btns{display:flex;gap:10px}
  .ctl-btns .btn-ctl{flex:1 1 0}
  .btn-ctl{display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;
    background:var(--panel);border:1px solid var(--line);color:var(--ink);border-radius:10px;
    padding:9px 14px;font:600 13px/1 inherit;cursor:pointer;transition:border-color .15s,transform .1s}
  .btn-ctl .dl-ico{width:15px;height:15px;flex:0 0 auto}
  @media(hover:hover){.btn-ctl:hover{border-color:var(--clay);transform:translateY(-1px)}}
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
  @media(hover:hover){.png-sz:hover{border-color:var(--clay);transform:translateY(-1px)}}
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
  function setSize(){ preview.style.setProperty('--pp', sizer.value+'px'); if(sizeVal) sizeVal.textContent=sizer.value+'px';
    var mn=parseInt(sizer.min,10)||3, mx=parseInt(sizer.max,10)||30, pct=(sizer.value-mn)/(mx-mn)*100;
    sizer.style.background='linear-gradient(90deg,var(--clay) '+pct+'%,var(--line) '+pct+'%)'; }
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
