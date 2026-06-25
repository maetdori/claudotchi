// io.mjs — shared helpers for hook/statusline scripts.

export async function readStdin() {
  return await new Promise((resolve) => {
    let data = '';
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(data); } };
    // If nothing is piped, don't hang forever.
    const timer = setTimeout(done, 1500);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => { clearTimeout(timer); done(); });
    process.stdin.on('error', () => { clearTimeout(timer); done(); });
  });
}

export async function readInput() {
  try {
    const raw = await readStdin();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Pull the context-window usage % out of the status-line payload, tolerating a
// couple of shapes / falling back to a token ratio if the field is absent.
export function contextPct(input) {
  const cw = input.context_window || input.contextWindow;
  if (cw) {
    if (typeof cw.used_percentage === 'number') return cw.used_percentage;
    const size = cw.context_window_size || cw.size;
    const used = (cw.total_input_tokens || 0) + (cw.total_output_tokens || 0);
    if (size) return (used / size) * 100;
  }
  return 0;
}

export function emitAdditionalContext(eventName, text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: eventName, additionalContext: text },
  }));
}
