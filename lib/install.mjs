// install.mjs — self-register the pet status line into the user's settings.json.
//
// Claude Code plugins cannot declare a statusLine natively (plugin.json and a
// plugin's settings.json only support `agent` / `subagentStatusLine`), so the
// SessionStart hook writes it into ~/.claude/settings.json on first run. The
// path is resolved to an absolute location here because ${CLAUDE_PLUGIN_ROOT}
// is NOT expanded inside statusLine commands.

import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, chmodSync } from 'node:fs';
import { BASE_DIR } from './state.mjs';

function pluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT) return process.env.CLAUDE_PLUGIN_ROOT;
  // this file lives at <root>/lib/install.mjs
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

const settingsPath = () => join(homedir(), '.claude', 'settings.json');
const petCommand = () => `node "${join(pluginRoot(), 'statusline', 'claudotchi.mjs')}"`;
const wrapperPath = () => join(homedir(), '.claude', 'claudotchi-combined.sh');
// our own status line, whether the plain pet script or the combine wrapper we wrote.
const isPetCmd = (cmd) => typeof cmd === 'string' && cmd.includes('claudotchi') && cmd.includes('statusline');
const isWrapperCmd = (cmd) => typeof cmd === 'string' && cmd.includes('claudotchi-combined');

// Read ~/.claude/settings.json → { obj, exists, parseError }. Never throws.
function readSettings() {
  const path = settingsPath();
  if (!existsSync(path)) return { obj: {}, exists: false, parseError: false };
  try { return { obj: JSON.parse(readFileSync(path, 'utf8')) || {}, exists: true, parseError: false }; }
  catch { return { obj: null, exists: true, parseError: true }; }
}
function writeSettings(obj) { writeFileSync(settingsPath(), JSON.stringify(obj, null, 2) + '\n'); }
// keep a single restore point next to settings.json before we mutate it.
function backup() {
  const path = settingsPath();
  if (!existsSync(path)) return null;
  const bak = path + '.claudotchi-bak';
  try { copyFileSync(path, bak); return bak; } catch { return null; }
}
function markInstalled() {
  const sentinel = join(BASE_DIR, '.statusline-installed');
  try { if (!existsSync(BASE_DIR)) mkdirSync(BASE_DIR, { recursive: true }); writeFileSync(sentinel, String(Date.now())); }
  catch { /* ignore */ }
}
// single-quote a string for safe embedding in the generated bash wrapper.
const shq = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

// Returns { action } where action is one of:
//   'installed'        — added our statusLine (first time)
//   'updated'          — our statusLine existed but its path was stale; fixed it
//   'skipped-existing' — user already has a different statusLine; left untouched
//   'noop' | 'error'   — nothing to do / failed silently
export function ensureStatusline() {
  try {
    const script = join(pluginRoot(), 'statusline', 'claudotchi.mjs');
    const desired = `node "${script}"`;
    const settingsPath = join(homedir(), '.claude', 'settings.json');
    const sentinel = join(BASE_DIR, '.statusline-installed');
    const sentinelExists = existsSync(sentinel);

    let obj = {};
    if (existsSync(settingsPath)) {
      try {
        obj = JSON.parse(readFileSync(settingsPath, 'utf8')) || {};
      } catch {
        return { action: 'error' }; // never clobber a file we can't parse
      }
    }

    const sl = obj.statusLine;
    const isOurs = sl && typeof sl.command === 'string'
      && sl.command.includes('claudotchi') && sl.command.includes('statusline');

    const markSentinel = () => {
      try {
        if (!existsSync(BASE_DIR)) mkdirSync(BASE_DIR, { recursive: true });
        writeFileSync(sentinel, String(Date.now()));
      } catch { /* ignore */ }
    };
    const save = () => writeFileSync(settingsPath, JSON.stringify(obj, null, 2) + '\n');

    if (!sl && !sentinelExists) {
      obj.statusLine = { type: 'command', command: desired, padding: 0, refreshInterval: 3000 };
      save();
      markSentinel();
      return { action: 'installed' };
    }
    if (isOurs && sl.command !== desired) {
      // self-heal after a plugin update/move changed the absolute path
      sl.command = desired;
      save();
      return { action: 'updated' };
    }
    if (sl && !isOurs && !sentinelExists) {
      // a user-defined status line is already configured — respect it
      markSentinel();
      return { action: 'skipped-existing' };
    }
    return { action: 'noop' };
  } catch {
    return { action: 'error' };
  }
}

// ── /claudotchi:statusline backend ─────────────────────────────────────────────
// Diagnose and (on request) fix a status-line conflict. All of this writes to the
// user's global settings.json, so every mutation backs it up first and refuses to
// touch a file it can't parse.

// { status: 'pet' | 'combined' | 'other' | 'none' | 'error', command }
export function statuslineStatus() {
  const { obj, parseError } = readSettings();
  if (parseError) return { status: 'error', command: null };
  const cmd = obj.statusLine && obj.statusLine.command;
  if (!cmd) return { status: 'none', command: null };
  if (isWrapperCmd(cmd)) return { status: 'combined', command: cmd };
  if (isPetCmd(cmd)) return { status: 'pet', command: cmd };
  return { status: 'other', command: cmd };
}

// Overwrite whatever is there with the plain pet status line.
export function replaceStatusline() {
  const { obj, parseError } = readSettings();
  if (parseError) return { action: 'error', reason: 'settings.json 을 파싱할 수 없어 건드리지 않았어요.' };
  const prev = obj.statusLine && obj.statusLine.command;
  const bak = backup();
  obj.statusLine = { type: 'command', command: petCommand(), padding: 0, refreshInterval: 3000 };
  writeSettings(obj);
  markInstalled();
  return { action: 'replaced', backup: bak, previous: prev || null };
}

// Wrap the existing status line so BOTH it and the pet render (same stdin to each).
export function combineStatusline() {
  const { obj, parseError } = readSettings();
  if (parseError) return { action: 'error', reason: 'settings.json 을 파싱할 수 없어 건드리지 않았어요.' };
  const cmd = obj.statusLine && obj.statusLine.command;
  if (!cmd) return { action: 'no-existing' };       // nothing to combine → caller should just install
  if (isPetCmd(cmd)) return { action: 'already-pet' };
  if (isWrapperCmd(cmd)) return { action: 'already-combined' };

  const wrapper = wrapperPath();
  const script = [
    '#!/usr/bin/env bash',
    '# 클로도치: 기존 상태표시줄 + 펫을 함께 렌더 (/claudotchi:statusline 이 자동 생성).',
    '# 같은 입력 JSON을 둘에 전달하고 출력을 세로로 이어 붙입니다.',
    'input=$(cat)',
    `mine=$(printf '%s' "$input" | bash -c ${shq(cmd)})`,
    `pet=$(printf '%s' "$input" | ${petCommand()})`,
    "printf '%s\\n%s\\n' \"$mine\" \"$pet\"",
    '',
  ].join('\n');

  const bak = backup();
  writeFileSync(wrapper, script);
  try { chmodSync(wrapper, 0o755); } catch { /* best effort */ }
  obj.statusLine = {
    type: 'command', command: `bash "${wrapper}"`,
    padding: 0, refreshInterval: (obj.statusLine && obj.statusLine.refreshInterval) || 3000,
  };
  writeSettings(obj);
  markInstalled();
  return { action: 'combined', wrapper, wrapped: cmd, backup: bak };
}

// Restore settings.json from the backup the last replace/combine wrote.
export function revertStatusline() {
  const path = settingsPath();
  const bak = path + '.claudotchi-bak';
  if (!existsSync(bak)) return { action: 'no-backup' };
  try { copyFileSync(bak, path); return { action: 'reverted' }; }
  catch { return { action: 'error', reason: '백업 복원에 실패했어요.' }; }
}
