// cli.mjs — backs the /claudotchi:breed, :family, :sulk and :config slash commands.
//   node cli.mjs breed              -> list breeding candidates (numbered)
//   node cli.mjs breed <i> <j>      -> breed candidate i with j -> pending offspring
//   node cli.mjs family             -> show the family tree / graveyard
//   node cli.mjs sulk [on|off]      -> toggle (or show) the 😤 sulk minigame
//   node cli.mjs config             -> show every setting (value + source)
//   node cli.mjs config <k> <v>     -> set setting k (persists to config.json)
//   node cli.mjs config <k> default -> clear the override (back to env/default)

import { listAllPets, savePending } from './state.mjs';
import { node, gradeOf } from './chart.mjs';
import { recombine, deriveTraits } from './genome.mjs';
import { allTombstones } from './graveyard.mjs';
import { SETTINGS, getSetting, setConfig, unsetConfig, resolveKey } from './config.mjs';
import { statuslineStatus, replaceStatusline, combineStatusline, revertStatusline } from './install.mjs';

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

const SRC_LABEL = { config: '슬래시 명령 설정', env: 'env', default: '기본값' };

function sulk(arg) {
  const a = String(arg || 'status').toLowerCase();
  if (a === 'on' || a === 'off') {
    setConfig('sulk', a === 'on');
    console.log(a === 'on'
      ? '😤 삐짐 기능을 켰어요. 오래 방치하면 클로드가 삐지고, 다정한 말("고마워, 잘하고 있어")로 풀 수 있어요.'
      : '🛟 삐짐 기능을 껐어요. 이제 펫이 삐지지 않고 도구도 막지 않습니다. (진행 중이던 삐짐은 다음 도구 사용 때 자동 해제)');
    return;
  }
  const { value, source } = getSetting('sulk');
  const src = source === 'env' ? 'env CLAUDOTCHI_SULK' : SRC_LABEL[source];
  console.log(`😤 삐짐 기능: ${value ? '켜짐' : '꺼짐'} (${src})`);
  console.log('바꾸려면:  /claudotchi:sulk on   또는   /claudotchi:sulk off');
}

// Show all settings, or set/clear one.
function config(rawKey, rawValue) {
  if (!rawKey) { printSettings(); return; }

  const key = resolveKey(rawKey);
  if (!key) {
    console.log(`알 수 없는 설정: "${rawKey}"`);
    console.log(`설정할 수 있는 항목: ${Object.keys(SETTINGS).join(', ')}`);
    console.log('전체 보기:  /claudotchi:config');
    return;
  }
  const spec = SETTINGS[key];

  // Show just this one setting when no value is given.
  if (rawValue === undefined) {
    const { value, source } = getSetting(key);
    console.log(`${spec.label}: ${spec.format(value)}  (${SRC_LABEL[source]})`);
    console.log(`바꾸려면:  /claudotchi:config ${key} <${spec.hint}>`);
    return;
  }

  // Clear an override → fall back to env/default.
  if (['default', 'reset', 'clear', '기본값'].includes(String(rawValue).toLowerCase())) {
    unsetConfig(key);
    const { value, source } = getSetting(key);
    console.log(`↩️  ${spec.label} 설정을 초기화했어요 → 현재 ${spec.format(value)} (${SRC_LABEL[source]})`);
    return;
  }

  const parsed = spec.parseInput(rawValue);
  if (parsed.error) {
    console.log(`⚠️  ${spec.label}: ${parsed.error}  (입력값 "${rawValue}")`);
    console.log(`예)  /claudotchi:config ${key} <${spec.hint}>`);
    return;
  }
  setConfig(key, parsed.value);
  console.log(`✅ ${spec.label} → ${spec.format(parsed.value)}  (모든 세션 공유·영속)`);
  if (key === 'lifespan') console.log('   새 세션부터 나이 계산과 단계 경계에 반영됩니다.');
  if (key === 'sprite') console.log('   상태표시줄이 다음 갱신 때 새 렌더로 바뀝니다.');
  if (key === 'llm' && parsed.value) console.log('   ANTHROPIC_API_KEY가 있어야 실제로 LLM 채점이 켜집니다(없으면 휴리스틱).');
}

function printSettings() {
  console.log('⚙️  클로도치 설정 (config.json · 모든 세션 공유·영속)\n');
  for (const [key, spec] of Object.entries(SETTINGS)) {
    const { value, source } = getSetting(key);
    console.log(`  ${spec.label.padEnd(9)}  ${spec.format(value)}`);
    console.log(`  ${' '.repeat(9)}  ${spec.desc}`);
    console.log(`  ${' '.repeat(9)}  현재 출처: ${SRC_LABEL[source]} · 바꾸기: /claudotchi:config ${key} <${spec.hint}>\n`);
  }
  console.log('초기화:  /claudotchi:config <항목> default');
  console.log('질의형 설정 마법사:  /claudotchi:setup');
}

// ── /claudotchi:statusline — diagnose & fix a status-line conflict ──────────────
function statusline(arg) {
  const a = String(arg || 'status').toLowerCase();

  if (a === 'replace') {
    const r = replaceStatusline();
    if (r.action === 'error') { console.log(`⚠️  ${r.reason}`); return; }
    console.log('✅ 상태표시줄을 클로도치 펫으로 교체했어요.');
    if (r.previous) console.log(`   (이전 statusLine은 백업해 뒀어요: ${r.backup})`);
    console.log('   다음 새로고침(또는 새 세션)부터 펫이 나타납니다. 되돌리려면 /claudotchi:statusline revert');
    return;
  }
  if (a === 'combine') {
    const r = combineStatusline();
    if (r.action === 'error') { console.log(`⚠️  ${r.reason}`); return; }
    if (r.action === 'no-existing') { console.log('기존 statusLine이 없어요. 교체 대신 그냥 등록하면 됩니다: /claudotchi:statusline replace'); return; }
    if (r.action === 'already-pet') { console.log('이미 펫 상태표시줄이에요 — 합칠 것이 없어요.'); return; }
    if (r.action === 'already-combined') { console.log('이미 기존 것과 합쳐진 상태예요.'); return; }
    console.log('✅ 기존 상태표시줄과 펫을 함께 보이도록 합쳤어요.');
    console.log(`   래퍼 스크립트: ${r.wrapper}`);
    console.log(`   감싼 기존 명령: ${r.wrapped}`);
    console.log('   다음 새로고침(또는 새 세션)부터 둘 다 나타납니다. 되돌리려면 /claudotchi:statusline revert');
    return;
  }
  if (a === 'revert') {
    const r = revertStatusline();
    if (r.action === 'no-backup') { console.log('되돌릴 백업이 없어요 (아직 교체/합치기를 한 적이 없어요).'); return; }
    if (r.action === 'error') { console.log(`⚠️  ${r.reason}`); return; }
    console.log('↩️  settings.json 을 이전 상태로 되돌렸어요.');
    return;
  }

  // default: diagnose
  const s = statuslineStatus();
  console.log('🎀 클로도치 상태표시줄 진단\n');
  if (s.status === 'error') {
    console.log('  ⚠️ ~/.claude/settings.json 을 파싱할 수 없어요. 파일을 고친 뒤 다시 시도하세요 (건드리지 않았어요).');
    return;
  }
  if (s.status === 'pet') {
    console.log('  ✅ 이미 펫 상태표시줄이 적용돼 있어요. 할 일 없음.');
    return;
  }
  if (s.status === 'combined') {
    console.log('  ✅ 기존 상태표시줄과 펫이 함께 표시되도록 합쳐진 상태예요. 할 일 없음.');
    console.log('     펫만 쓰려면: /claudotchi:statusline replace · 되돌리려면: /claudotchi:statusline revert');
    return;
  }
  if (s.status === 'none') {
    console.log('  ℹ️ 등록된 statusLine이 없어요. 펫을 등록하려면: /claudotchi:statusline replace');
    return;
  }
  // 'other'
  console.log('  ⚠️ 이미 다른 statusLine이 설정돼 있어요:');
  console.log(`       ${s.command}\n`);
  console.log('  두 가지 중 하나를 고르세요:');
  console.log('   • 클로도치로 교체        →  /claudotchi:statusline replace');
  console.log('   • 기존 것과 함께 보기     →  /claudotchi:statusline combine');
  console.log('  (교체/합치기 전에 settings.json 을 자동 백업하고, /claudotchi:statusline revert 로 되돌릴 수 있어요.)');
}

const [sub, ...rest] = process.argv.slice(2);
if (sub === 'family') {
  family();
} else if (sub === 'sulk') {
  sulk(rest[0]);
} else if (sub === 'statusline') {
  statusline(rest[0]);
} else if (sub === 'config') {
  config(rest[0], rest.length >= 2 ? rest.slice(1).join(' ') : undefined);
} else { // 'breed' or default
  const list = candidates();
  const nums = rest.map((x) => parseInt(x, 10)).filter((x) => Number.isInteger(x));
  if (nums.length >= 2) breed(list, nums[0], nums[1]);
  else printList(list);
}
