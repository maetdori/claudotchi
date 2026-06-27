// config.mjs — a tiny persisted key/value store at ~/.claude/claudotchi/config.json.
//
// Slash commands run as a child process and can't mutate the parent Claude Code
// env, so a toggle like /claudotchi:sulk writes its choice here instead of to an
// env var. Hooks then read it back via loadConfig() on their next run.

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
