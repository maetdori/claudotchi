// chart.mjs — the fixed growth chart (가계도) and deterministic transitions.
//
// Two independent axes drive a pet:
//   * AGE   = context-window usage %  (the lifespan clock; measured by statusline)
//   * FORM  = which node of the tree it has evolved into, decided at each stage
//             boundary by the care stat that dominates that stage.
//
// There is NO randomness here: the same stat history always yields the same
// adult. That is the whole point — "어떤 캐릭터로 컸는가 = AI를 어떻게 썼는가".

export const LIFESPAN_PCT = 40; // context % that equals a full lifespan (death)

// stage boundaries on the context-% lifespan clock.
export const STAGES = [
  { id: 'egg',   min: 0 },
  { id: 'baby',  min: 2 },
  { id: 'child', min: 8 },
  { id: 'teen',  min: 18 },
  { id: 'adult', min: 32 },
  { id: 'dead',  min: LIFESPAN_PCT },
];
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
  alklo: { name: '알클로',  emoji: '🐣', stage: 'baby', branchStat: 'intel', children: { high: 'ddolttol', mid: 'pyeongbeom', low: 'malsseong' } },

  // children (decided by diligence during the child stage)
  ddolttol:   { name: '똘똘이', emoji: '🐤', stage: 'child', branchStat: 'dilig', children: { high: 'busy_model',  low: 'relaxed_genius' } },
  pyeongbeom: { name: '평범이', emoji: '🐤', stage: 'child', branchStat: 'dilig', children: { high: 'diligent_avg', low: 'relaxed_avg' } },
  malsseong:  { name: '말썽이', emoji: '🐤', stage: 'child', branchStat: 'dilig', children: { high: 'busy_trouble', low: 'neglected_trouble' } },

  // teens (decided by cleanliness during the teen stage)
  busy_model:        { name: '부지런모범생', emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'master',        low: 'nerd' } },
  relaxed_genius:    { name: '느긋수재',     emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'pro',           low: 'basement_genius' } },
  diligent_avg:      { name: '성실평범',     emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'model_citizen', low: 'glutton' } },
  relaxed_avg:       { name: '느긋평범',     emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'mypace',        low: 'lazy' } },
  busy_trouble:      { name: '부지런말썽',   emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'clown',         low: 'berserk' } },
  neglected_trouble: { name: '방치말썽',     emoji: '🧒', stage: 'teen', branchStat: 'clean', children: { high: 'zombie',        low: 'oyaji' } },

  // adults (leaves) — the fixed roster + their grade
  master:          { name: '마스터클로드',   emoji: '✨', stage: 'adult', grade: 'S', profile: '지능·성실·청결 모두 高 — 이상적 활용' },
  nerd:            { name: '너드클로드',     emoji: '🧪', stage: 'adult', grade: 'A', profile: '똑똑하나 에러를 방치 (청결 低)' },
  pro:             { name: '프로클로드',     emoji: '😎', stage: 'adult', grade: 'A', profile: '느긋하지만 정확 (청결 高)' },
  basement_genius: { name: '방구석천재',     emoji: '🦥', stage: 'adult', grade: 'B', profile: '재능은 있는데 성실·청결이 아쉬움' },
  model_citizen:   { name: '모범시민클로드', emoji: '🙂', stage: 'adult', grade: 'B', profile: '고루 양호' },
  glutton:         { name: '먹보클로드',     emoji: '🐷', stage: 'adult', grade: 'C', profile: '열심인데 지저분 (청결 低)' },
  mypace:          { name: '마이페이스클로', emoji: '🐱', stage: 'adult', grade: 'C', profile: '깔끔하지만 띄엄띄엄 (성실 低)' },
  lazy:            { name: '게으름보',       emoji: '🥱', stage: 'adult', grade: 'C', profile: '전반적으로 저조' },
  clown:           { name: '삐에로클로드',   emoji: '🤡', stage: 'adult', grade: 'D', profile: '바쁜데 헛심 (지능 低)' },
  berserk:         { name: '폭주클로드',     emoji: '👹', stage: 'adult', grade: 'D', profile: '마구잡이 (지능·청결 低)' },
  zombie:          { name: '좀비클로드',     emoji: '🧟', stage: 'adult', grade: 'D', profile: '방치됨 (성실·지능 低)' },
  oyaji:           { name: '오야지치',       emoji: '🧓', stage: 'adult', grade: 'F', profile: '성의없음 누적 — 전 축 최하' },
  legend:          { name: '레전드클로드',   emoji: '🌟', stage: 'adult', grade: '★', profile: '히든 — 완벽한 케어 + 명문 혈통' },
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
export function isLegendEligible(state) {
  return (state.generation || 1) >= 3 && (state.bond || 0) >= 10 && (state.reflex || 0) >= 10;
}

function chooseChild(n, state) {
  if (!n.children) return null;
  if (n.branchStat === null) return n.children._;
  const score = statScore(state, n.branchStat);
  const tier = tierFor(n.branchStat, score, n.children);
  let childId = n.children[tier];
  if (childId === 'master' && isLegendEligible(state)) childId = 'legend';
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
