// cli.mjs — backs the /claudotchi:breed and :family slash commands.
//   node cli.mjs breed            -> list breeding candidates (numbered)
//   node cli.mjs breed <i> <j>    -> breed candidate i with j -> pending offspring
//   node cli.mjs family           -> show the family tree / graveyard

import { listAllPets, savePending } from './state.mjs';
import { node, gradeOf } from './chart.mjs';
import { recombine, deriveTraits } from './genome.mjs';
import { allTombstones } from './graveyard.mjs';

// Build a single candidate list from both living pets and tombstones.
function candidates() {
  const list = [];
  for (const p of listAllPets()) {
    list.push({
      kind: p.dead ? 'dead' : 'living',
      sessionId: p.sessionId,
      generation: p.generation || 1,
      promptCount: p.promptCount || 0,
      toolCalls: p.toolCalls || 0,
      intelligence: p.intelligence || 0,
      diligence: p.diligence || 0,
      cleanliness: p.cleanliness || 0,
      genome: p.genome || { traits: deriveTraits(p) },
      form: p.currentForm,
      project: p.project || '',
    });
  }
  for (const t of allTombstones()) {
    list.push({
      kind: 'grave',
      sessionId: t.sessionId,
      generation: t.generation || 1,
      promptCount: 1,
      toolCalls: 1,
      intelligence: t.stats?.intelligence || 0,
      diligence: t.stats?.diligence || 0,
      cleanliness: t.stats?.cleanliness || 0,
      genome: t.genome || {},
      form: t.form,
      project: t.project || '',
    });
  }
  return list;
}

function label(c) {
  const n = node(c.form || 'egg');
  const fam = (c.genome && c.genome.traits && c.genome.traits.family) || '?';
  const tag = c.kind === 'grave' ? '🪦' : c.kind === 'dead' ? '✝' : '🟢';
  return `${tag} ${n.emoji} ${n.name} (${gradeOf(c.form || 'egg')}급) · ${fam} ${c.generation}대 · ${c.project || c.sessionId}`;
}

function printList(list) {
  if (!list.length) {
    console.log('아직 키운 클로드 펫이 없어요. 다른 세션에서 한동안 키운 뒤 다시 시도하세요.');
    return;
  }
  console.log('교배 후보 (번호 두 개를 골라 `/claudotchi:breed i j`):\n');
  list.forEach((c, i) => console.log(`  ${i + 1}. ${label(c)}`));
  console.log('\n예) /claudotchi:breed 1 2');
}

function breed(list, i, j) {
  const a = list[i - 1];
  const b = list[j - 1];
  if (!a || !b) {
    console.log(`잘못된 번호예요. 1 ~ ${list.length} 사이로 두 개를 고르세요.`);
    return;
  }
  if (i === j) {
    console.log('서로 다른 두 펫을 골라야 합니다 (자가 교배 불가).');
    return;
  }
  const genome = recombine(a, b);
  const generation = Math.max(a.generation || 1, b.generation || 1) + 1;
  savePending({ genome, parents: [a.sessionId, b.sessionId], generation });
  const t = genome.traits;
  console.log('💞 교배 완료! 다음에 새 세션을 열면(또는 현재 세션이 죽으면) 자손이 부화합니다.\n');
  console.log(`  부모: ${label(a)}`);
  console.log(`        × ${label(b)}`);
  console.log(`  자손 genome: ${t.family} · 색=${t.palette} · 장식=${t.accessory} · ${generation}대`);
  console.log(`  소질 편향: 🧠${genome.predisposition.intel} ⚡${genome.predisposition.dilig} 🧼${genome.predisposition.clean}`);
}

function family() {
  const graves = allTombstones();
  const living = listAllPets().filter((p) => !p.dead);
  console.log('🌳 클로드 가계도\n');
  if (graves.length) {
    console.log('— 역대 세대 (묘비) —');
    graves
      .slice()
      .sort((x, y) => (x.generation || 1) - (y.generation || 1))
      .forEach((t) => {
        const parents = (t.parents && t.parents.length) ? ` ⟵ ${t.parents.join(' × ')}` : '';
        console.log(`  ${t.generation}대 ${t.emoji} ${t.name} (${t.grade}급)${parents}`);
      });
    console.log('');
  }
  if (living.length) {
    console.log('— 지금 살아있는 펫 —');
    living.forEach((p) => {
      const n = node(p.currentForm);
      console.log(`  ${n.emoji} ${n.name} · ${p.generation || 1}대 · ${p.project || p.sessionId}`);
    });
  }
  if (!graves.length && !living.length) console.log('아직 기록이 없어요.');
}

const [sub, ...rest] = process.argv.slice(2);
if (sub === 'family') {
  family();
} else { // 'breed' or default
  const list = candidates();
  const nums = rest.map((x) => parseInt(x, 10)).filter((x) => Number.isInteger(x));
  if (nums.length >= 2) breed(list, nums[0], nums[1]);
  else printList(list);
}
