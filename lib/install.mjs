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
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { BASE_DIR } from './state.mjs';

function pluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT) return process.env.CLAUDE_PLUGIN_ROOT;
  // this file lives at <root>/lib/install.mjs
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

// Returns { action } where action is one of:
//   'installed'        — added our statusLine (first time)
//   'updated'          — our statusLine existed but its path was stale; fixed it
//   'skipped-existing' — user already has a different statusLine; left untouched
//   'noop' | 'error'   — nothing to do / failed silently
export function ensureStatusline() {
  try {
    const script = join(pluginRoot(), 'statusline', 'claudchi.mjs');
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
      && sl.command.includes('claudchi') && sl.command.includes('statusline');

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
