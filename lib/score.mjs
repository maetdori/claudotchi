// score.mjs — turn raw user behaviour into care-stat deltas.
//
// Default scoring is heuristic: free, instant, no tokens. If CLAUDOTCHI_LLM=1
// (and an ANTHROPIC_API_KEY is present) prompt quality is instead scored by a
// small model, falling back to the heuristic on any error/timeout.

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ---- prompt quality -> 🧠 intelligence -------------------------------------

export function scorePromptHeuristic(prompt) {
  const p = (prompt || '').trim();
  const signals = [];
  let s = 0;

  const len = p.length;
  const words = p.split(/\s+/).filter(Boolean);

  if (len < 15) { s -= 1.5; signals.push('너무 짧음'); }
  else if (len >= 40 && len <= 2000) { s += 0.5; signals.push('적당한 길이'); }

  // concrete clues: file paths, code fences, numbers, identifiers
  if (/```|`[^`]+`/.test(p)) { s += 0.8; signals.push('코드 블록'); }
  if (/[\w./-]+\.(?:[a-zA-Z]{1,5})\b|\/\w+/.test(p)) { s += 0.7; signals.push('파일/경로'); }
  if (/\d/.test(p)) { s += 0.3; }

  // context / goal language (ko + en)
  if (/(왜냐|때문|목표|맥락|예시|예:|즉|따라서|so that|because|context|goal|for example|e\.g\.)/i.test(p)) {
    s += 0.6; signals.push('맥락/목표');
  }
  // a clear ask
  if (/[?？]/.test(p) || words.length >= 6) { s += 0.3; }

  // bad signals
  if (words.length <= 1) { s -= 1; signals.push('단발 명령'); }
  if (len > 3 && p === p.toUpperCase() && /[A-Z]/.test(p)) { s -= 1; signals.push('전부 대문자'); }
  if (/^(고쳐|해줘?|빨리|그냥 해|아무거나|대충)\.?$/.test(p)) { s -= 0.8; signals.push('성의 부족'); }

  return { intel: clamp(round1(s), -2, 3), signals };
}

function round1(x) { return Math.round(x * 10) / 10; }

// Optional LLM scoring. Returns {intel, signals} or null if disabled/failed.
export async function scorePromptLLM(prompt) {
  if (process.env.CLAUDOTCHI_LLM !== '1' || !process.env.ANTHROPIC_API_KEY) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDOTCHI_LLM_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 16,
        messages: [{
          role: 'user',
          content: `Rate this coding-assistant prompt for clarity/specificity from 1 (vague) to 10 (excellent). Reply with ONLY the number.\n\nPROMPT:\n${String(prompt).slice(0, 2000)}`,
        }],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data?.content?.[0]?.text || '').trim();
    const n = parseFloat(text);
    if (!Number.isFinite(n)) return null;
    // map 1..10 -> -2..3
    const intel = clamp(round1(((n - 1) / 9) * 5 - 2), -2, 3);
    return { intel, signals: [`LLM ${n}/10`] };
  } catch {
    return null;
  }
}

export async function scorePrompt(prompt) {
  return (await scorePromptLLM(prompt)) || scorePromptHeuristic(prompt);
}

// ---- interaction regularity -> ⚡ diligence --------------------------------

export function diligenceDelta(nowMs, lastTsMs) {
  if (!lastTsMs) return 0; // first prompt of the pet's life
  const gap = nowMs - lastTsMs;
  const min = gap / 60000;
  if (min < 0.5) return 0.5;   // engaged
  if (min <= 10) return 1;     // steady, attentive care
  if (min <= 30) return 0;     // a little long
  if (min <= 120) return -1;   // neglect
  return -2;                   // long abandonment
}

// ---- affection (unblock a sulking pet) -> ❤️ bond --------------------------

const AFFECTION = /(고마워|고맙|감사|사랑|최고|잘했|잘 했|대단|훌륭|미안|수고|예뻐|귀여|착해|좋아|please|thank|thanks|good job|well done|love you|sorry|great job|nice work|awesome)/i;

export function detectAffection(prompt) {
  const p = prompt || '';
  const matches = p.match(new RegExp(AFFECTION, 'gi'));
  const count = matches ? matches.length : 0;
  return { affectionate: count > 0, intensity: Math.min(3, count) };
}
