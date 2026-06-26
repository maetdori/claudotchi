// chart.mjs — the fixed growth chart (가계도) and deterministic transitions.
//
// Two independent axes drive a pet:
//   * AGE   = context-window usage %  (the lifespan clock; measured by statusline)
//   * FORM  = which node of the tree it has evolved into, decided at each stage
//             boundary by the care stat that dominates that stage.
//
// There is NO randomness here: the same stat history always yields the same
// adult. That is the whole point — "어떤 캐릭터로 컸는가 = AI를 어떻게 썼는가".

// Lifespan = context % that equals one full life (death). Default 40, overridable
// with CLAUDOCHI_LIFESPAN (1–100). Stage boundaries are expressed as fractions of
// a lifespan, so the arc keeps the same shape at any lifespan value.
function envLifespan() {
  const v = parseFloat(process.env.CLAUDOCHI_LIFESPAN || '');
  return Number.isFinite(v) && v > 0 && v <= 100 ? v : 40;
}
export const LIFESPAN_PCT = envLifespan();

// fraction of a lifespan at which each stage begins (defaults match 40 → 0/2/8/18/32/40).
const STAGE_FRACTIONS = [
  ['egg', 0], ['baby', 0.05], ['child', 0.20], ['teen', 0.45], ['adult', 0.80], ['dead', 1],
];
export const STAGES = STAGE_FRACTIONS.map(([id, f]) => ({ id, min: f * LIFESPAN_PCT }));
const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
const ADULT_IDX = STAGE_INDEX.adult;

export function stageForPct(pct) {
  let cur = STAGES[0].id;
  for (const s of STAGES) if (pct >= s.min) cur = s.id;
  return cur;
}

// Tree topology + per-node metadata. branchStat = the stat accumulated *while at
// this node* that decides which child it grows into. Leaves (adults) have a grade.
export const NODES = {
  egg:   { name: '알',      emoji: '🥚', stage: 'egg',  branchStat: null,    children: { _: 'alklo' } },
  alklo: { name: '아기도치',  emoji: '🐣', stage: 'baby', branchStat: 'intel', children: { high: 'ddolttol', mid: 'pyeongbeom', low: 'malsseong' } },

  // children (decided by diligence during the child stage)
  ddolttol:   { name: '똘똘도치', emoji: '🐤', stage: 'child', branchStat: 'dilig', children: { high: 'busy_model',  low: 'relaxed_genius' } },
  pyeongbeom: { name: '평범도치', emoji: '🐤', stage: 'child', branchStat: 'dilig', children: { high: 'diligent_avg', low: 'relaxed_avg' } },
  malsseong:  { name: '말썽도치', emoji: '🐤', stage: 'child', branchStat: 'dilig', children: { high: 'busy_trouble', low: 'neglected_trouble' } },

  // teens (decided by cleanliness during the teen stage)
  busy_model:        { name: '근면도치', emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'master',        low: 'nerd' } },
  relaxed_genius:    { name: '여유도치',     emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'pro',           low: 'basement_genius' } },
  diligent_avg:      { name: '성실도치',     emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'model_citizen', low: 'glutton' } },
  relaxed_avg:       { name: '느긋도치',     emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'mypace',        low: 'lazy' } },
  busy_trouble:      { name: '부산도치',   emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'clown',         low: 'berserk' } },
  neglected_trouble: { name: '방치도치',     emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'zombie',        low: 'oyaji' } },

  // adults (leaves) — the fixed roster + their grade
  master:          { name: '마스터도치',   emoji: '✨', stage: 'adult', grade: 'S', profile: '지능·성실·청결 모두 높음 — 이상적 활용' },
  nerd:            { name: '너드도치',     emoji: '🧪', stage: 'adult', grade: 'A', profile: '똑똑하나 에러를 방치 (청결 낮음)' },
  pro:             { name: '프로도치',     emoji: '😎', stage: 'adult', grade: 'A', profile: '느긋하지만 정확 (청결 높음)' },
  basement_genius: { name: '방구석도치',     emoji: '🦥', stage: 'adult', grade: 'B', profile: '재능은 있는데 성실·청결이 아쉬움' },
  model_citizen:   { name: '모범도치', emoji: '🙂', stage: 'adult', grade: 'B', profile: '고루 양호' },
  glutton:         { name: '먹보도치',     emoji: '🐷', stage: 'adult', grade: 'C', profile: '열심인데 지저분 (청결 낮음)' },
  mypace:          { name: '마페도치', emoji: '🐱', stage: 'adult', grade: 'C', profile: '깔끔하지만 띄엄띄엄 (성실 낮음)' },
  lazy:            { name: '게으른도치',       emoji: '🥱', stage: 'adult', grade: 'C', profile: '전반적으로 저조' },
  clown:           { name: '삐에로도치',   emoji: '🤡', stage: 'adult', grade: 'D', profile: '바쁜데 헛심 (지능 낮음)' },
  berserk:         { name: '폭주도치',     emoji: '👹', stage: 'adult', grade: 'D', profile: '마구잡이 (지능·청결 낮음)' },
  zombie:          { name: '좀비도치',     emoji: '🧟', stage: 'adult', grade: 'D', profile: '방치됨 (성실·지능 낮음)' },
  oyaji:           { name: '아재도치',       emoji: '🧓', stage: 'adult', grade: 'F', profile: '성의없음 누적 — 전 축 최하' },
  legend:          { name: '레전도치',   emoji: '🌟', stage: 'adult', grade: '★', hidden: true, profile: '히든 — 완벽한 케어 + 명문 혈통' },
  nyang:           { name: '냥냥도치',   emoji: '🐱', stage: 'adult', grade: '★', hidden: true, profile: '히든 — 마페도치를 교감만렙(❤️12↑)으로 키우면 고양이가 됩니다' },
};

export function node(id) { return NODES[id] || NODES.egg; }
export function gradeOf(id) { return node(id).grade || '-'; }
export function isAdult(id) { return node(id).stage === 'adult'; }

// Bias from inherited predisposition (small — current behaviour must dominate).
function bias(state, key) {
  const p = state.genome && state.genome.predisposition;
  return p && typeof p[key] === 'number' ? p[key] * 0.4 : 0;
}

// Score for the driving stat at the moment of a transition: the cumulative
// average so far, so it is well-defined no matter when/how often the status line
// runs (even if the pet ages several stages between two renders). Each stat is
// consumed by exactly one transition, and currentForm constrains the children,
// so the family tree stays path-dependent. Cleanliness is tool-driven; with no
// tools yet, treat the pet as mildly clean (absence of errors isn't punished).
function statScore(state, branchStat) {
  const p = Math.max(1, state.promptCount);
  if (branchStat === 'intel') return state.intelligence / p + bias(state, 'intel');
  if (branchStat === 'dilig') return state.diligence / p + bias(state, 'dilig');
  if (branchStat === 'clean') {
    const t = state.toolCalls || 0;
    const base = t > 0 ? state.cleanliness / t : 0.2;
    return base + bias(state, 'clean');
  }
  return 0;
}

// Map a stat score to one of the child tiers available on this node.
function tierFor(branchStat, score, children) {
  if ('mid' in children) {
    if (score >= 1.2) return 'high';
    if (score <= 0.2) return 'low';
    return 'mid';
  }
  // two-tier nodes
  const split = branchStat === 'clean' ? 0.0 : 0.3;
  return score >= split ? 'high' : 'low';
}

// Rare hidden form: only when the path would already reach the very top AND the
// lineage/bond justify it. Still 100% deterministic.
// Lineage + deep bond. (Used to also require ⭐reflex, but the reaction challenge
// that fed reflex is gone, so the legend is gated on care/affection now.)
export function isLegendEligible(state) {
  return (state.generation || 1) >= 3 && (state.bond || 0) >= 10;
}

// Second hidden form: the cat. Pure affection route — a 마페도치(cat) loved to a
// 교감 max becomes 냥냥도치. Orthogonal to grade/lineage, so even a casual carer
// can unlock it. Deterministic, like everything else here.
export function isNyangEligible(state) {
  return (state.bond || 0) >= 12;
}

function chooseChild(n, state) {
  if (!n.children) return null;
  if (n.branchStat === null) return n.children._;
  const score = statScore(state, n.branchStat);
  const tier = tierFor(n.branchStat, score, n.children);
  let childId = n.children[tier];
  if (childId === 'master' && isLegendEligible(state)) childId = 'legend';
  else if (childId === 'mypace' && isNyangEligible(state)) childId = 'nyang';
  return childId;
}

// Advance the pet's FORM to match its AGE (context %). Mutates `state`.
// Death (pct >= LIFESPAN) is left to the caller, which must record the tombstone;
// here we only make sure the pet finishes evolving to its adult form first so the
// grave records a real character. Returns the list of evolution events that fired.
export function advance(state, pct) {
  const events = [];
  const targetIdx = STAGE_INDEX[stageForPct(pct)];
  const evolveToIdx = Math.min(targetIdx, ADULT_IDX); // can't evolve past adult
  let guard = 0;
  while (STAGE_INDEX[state.stage] < evolveToIdx && guard++ < STAGES.length) {
    const n = node(state.currentForm);
    const childId = chooseChild(n, state);
    if (!childId) break;
    const nextStage = STAGES[STAGE_INDEX[state.stage] + 1].id;
    state.currentForm = childId;
    state.stage = nextStage;
    events.push({ to: childId, name: NODES[childId].name, emoji: NODES[childId].emoji, stage: nextStage });
  }
  return events;
}
