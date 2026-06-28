// config.mjs — a tiny persisted key/value store at ~/.claude/claudotchi/config.json,
// plus the single schema every setting is resolved through.
//
// Slash commands run as a child process and can't mutate the parent Claude Code
// env, so toggles like /claudotchi:config write their choice here instead of to an
// env var. Hooks, the status line and the scorer then read it back via getSetting()
// on their next run. Precedence is always: stored config > env var > built-in default,
// so a slash-command choice wins and the env vars remain a fallback for people who
// prefer declaring them in settings.json.

import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { BASE_DIR, ensureDir } from './state.mjs';

const CONFIG_PATH = join(BASE_DIR, 'config.json');

export function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) || {};
  } catch { /* ignore a malformed config and fall back to defaults */ }
  return {};
}

export function setConfig(key, value) {
  ensureDir();
  const cfg = loadConfig();
  cfg[key] = value;
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
  return cfg;
}

// Remove a stored override so the env var / default takes over again.
export function unsetConfig(key) {
  ensureDir();
  const cfg = loadConfig();
  delete cfg[key];
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
  return cfg;
}

// ---- settings schema -------------------------------------------------------
//
// One entry per user-facing setting. Each knows how to parse its env var
// (parseEnv → value | undefined), parse slash-command input (parseInput →
// { value } | { error }) and pretty-print itself (format). Consumers never
// touch process.env directly — they call getSetting()/valueOf() so config.json
// and the env vars stay in sync through one place.
export const SETTINGS = {
  sulk: {
    label: '😤 삐짐',
    env: 'CLAUDOTCHI_SULK',
    default: true,
    hint: 'on | off',
    desc: '방치 시 삐져서 도구 차단, 다정한 말로 해제',
    parseEnv: (r) => (r === undefined ? undefined : r !== '0'),
    parseInput: (r) => {
      const a = String(r).toLowerCase();
      if (['on', 'true', '1'].includes(a)) return { value: true };
      if (['off', 'false', '0'].includes(a)) return { value: false };
      return { error: 'on 또는 off 로 지정하세요' };
    },
    format: (v) => (v ? '켜짐' : '꺼짐'),
  },
  lifespan: {
    label: '⏳ 수명',
    env: 'CLAUDOTCHI_LIFESPAN',
    default: 40,
    hint: '1 ~ 100',
    desc: '죽는 컨텍스트 %. 단계 경계도 비례 확장',
    parseEnv: (r) => {
      const v = parseFloat(r);
      return Number.isFinite(v) && v > 0 && v <= 100 ? v : undefined;
    },
    parseInput: (r) => {
      const v = parseFloat(r);
      return Number.isFinite(v) && v > 0 && v <= 100
        ? { value: v }
        : { error: '1 ~ 100 사이 숫자를 지정하세요' };
    },
    format: (v) => `컨텍스트 ${v}%`,
  },
  sprite: {
    label: '🎨 렌더',
    env: 'CLAUDOTCHI_SPRITE',
    default: 'pixel',
    hint: 'pixel | mini',
    desc: 'pixel=픽셀아트, mini=한 줄 이모지(작은 상태표시줄)',
    parseEnv: (r) => (r === undefined ? undefined : (String(r).toLowerCase() === 'mini' ? 'mini' : 'pixel')),
    parseInput: (r) => {
      const a = String(r).toLowerCase();
      if (a === 'pixel' || a === 'mini') return { value: a };
      return { error: 'pixel 또는 mini 로 지정하세요' };
    },
    format: (v) => (v === 'mini' ? 'mini (한 줄 이모지)' : 'pixel (픽셀아트)'),
  },
  llm: {
    label: '🧠 LLM 채점',
    env: 'CLAUDOTCHI_LLM',
    default: false,
    hint: 'on | off',
    desc: '프롬프트 품질을 가벼운 모델로 채점(ANTHROPIC_API_KEY 필요). off=휴리스틱(무료·즉시)',
    parseEnv: (r) => (r === undefined ? undefined : r === '1'),
    parseInput: (r) => {
      const a = String(r).toLowerCase();
      if (['on', 'true', '1'].includes(a)) return { value: true };
      if (['off', 'false', '0'].includes(a)) return { value: false };
      return { error: 'on 또는 off 로 지정하세요' };
    },
    format: (v) => (v ? '켜짐' : '꺼짐 (휴리스틱)'),
  },
  llmModel: {
    label: '🧬 LLM 모델',
    env: 'CLAUDOTCHI_LLM_MODEL',
    default: 'claude-haiku-4-5-20251001',
    hint: '<모델 ID>',
    desc: 'LLM 채점에 쓰는 모델 ID',
    aliases: ['llm-model', 'model'],
    parseEnv: (r) => (r === undefined || r === '' ? undefined : String(r)),
    parseInput: (r) => {
      const v = String(r).trim();
      return v ? { value: v } : { error: '모델 ID를 입력하세요' };
    },
    format: (v) => v,
  },
};

// Map an alias (or the canonical name) to a canonical setting key, or null.
export function resolveKey(name) {
  const k = String(name || '').trim();
  if (SETTINGS[k]) return k;
  const lower = k.toLowerCase();
  for (const [key, spec] of Object.entries(SETTINGS)) {
    if (key.toLowerCase() === lower) return key;
    if ((spec.aliases || []).some((a) => a.toLowerCase() === lower)) return key;
  }
  return null;
}

// Resolve a setting to { value, source } with precedence config > env > default.
export function getSetting(key) {
  const spec = SETTINGS[key];
  if (!spec) throw new Error(`unknown setting: ${key}`);
  const cfg = loadConfig();
  if (Object.prototype.hasOwnProperty.call(cfg, key)) {
    return { value: cfg[key], source: 'config' };
  }
  const raw = process.env[spec.env];
  if (raw !== undefined) {
    const v = spec.parseEnv(raw);
    if (v !== undefined) return { value: v, source: 'env' };
  }
  return { value: spec.default, source: 'default' };
}

// Convenience: just the resolved value.
export function valueOf(key) {
  return getSetting(key).value;
}
