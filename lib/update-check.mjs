// update-check.mjs — a gentle "새 버전 있어요" nudge for the SessionStart hook.
//
// Fetches the plugin's published version from GitHub at most once a day (cached under
// ~/.claude/claudotchi/update-check.json), compares it to the installed version, and
// returns a one-line message when the remote is newer. Network-guarded: a short abort
// timeout, and every failure path is silent (offline → no check, no error, no delay
// beyond the timeout). This is the one place plugin.json's `version` earns its keep —
// so remember to bump it on release, or the nudge never fires.
//
// Auto-update note: the plugin can't force-update an installed user (Claude Code pulls,
// it isn't pushed). Third-party marketplaces default to auto-update OFF, so the best we
// can do is nudge — and point users at the built-in per-marketplace auto-update toggle.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BASE_DIR, ensureDir } from './state.mjs';

const REMOTE_URL = 'https://raw.githubusercontent.com/maetdori/claudotchi/main/.claude-plugin/plugin.json';
const MARKETPLACE = 'maetdori-marketplace';   // `/plugin marketplace update <this>`
const CACHE_PATH = join(BASE_DIR, 'update-check.json');
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;   // at most one network check per day
const TIMEOUT_MS = 1500;                       // give up fast so startup never stalls

// The installed plugin's own version (this file lives at <plugin>/lib/update-check.mjs).
function installedVersion() {
  const here = dirname(fileURLToPath(import.meta.url));
  const pj = JSON.parse(readFileSync(join(here, '..', '.claude-plugin', 'plugin.json'), 'utf8'));
  return pj.version;
}

// true if version `a` is strictly newer than `b` (numeric dot parts; shorter = older).
function isNewer(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

function readCache() {
  try { return JSON.parse(readFileSync(CACHE_PATH, 'utf8')); } catch { return {}; }
}
function writeCache(obj) {
  try { ensureDir(); writeFileSync(CACHE_PATH, JSON.stringify(obj)); } catch { /* ignore */ }
}

async function fetchRemoteVersion() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(REMOTE_URL, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json.version === 'string' ? json.version : null;
  } catch {
    return null; // offline / timeout / bad JSON — stay silent
  } finally {
    clearTimeout(timer);
  }
}

// Returns a one-line update nudge, or null. Network I/O happens at most once per day;
// every other session start just reads the cached remote version (zero added latency).
export async function updateNotice(now = Date.now()) {
  let local;
  try { local = installedVersion(); } catch { return null; }

  const cache = readCache();
  let remote = typeof cache.remote === 'string' ? cache.remote : null;

  if (!cache.checkedTs || now - cache.checkedTs > CHECK_EVERY_MS) {
    const fetched = await fetchRemoteVersion();
    // Stamp the attempt either way so a flaky network doesn't retry every session;
    // keep the last known remote version if this particular fetch failed.
    remote = fetched || remote;
    writeCache({ checkedTs: now, remote });
  }

  if (remote && isNewer(remote, local)) {
    return `🆕 클로도치 v${remote} 나왔어요 (지금 v${local}) — \`/plugin marketplace update ${MARKETPLACE}\` 로 업데이트하세요. `
      + '(/plugin → Marketplaces에서 auto-update를 켜두면 다음부터 자동으로 받아져요.)';
  }
  return null;
}
