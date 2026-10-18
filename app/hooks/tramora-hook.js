'use strict';
// Tramora capture hook: writes one sanitized JSONL line per Codex lifecycle event.
// Install: copy this file into <project>/.codex/hooks/ and point hooks.json at it.
// Writes nothing unless TRAMORA_HOOK_LOG is set, so the project stays inert by default.
const fs = require('fs');
const MASK = '[redacted]';

const out = process.env.TRAMORA_HOOK_LOG;
if (!out) return;

// A key is sensitive if any of these tokens appears in its name. Redaction is
// structural and runs before serialisation: a regex over a serialized JSON string
// cannot see the pair, because a quote sits between the key and the colon
// (`{"password":"x"}`), so pattern-only redaction misses JSON payloads.
const SENSITIVE_KEY = /(secret|token|passw|credential|api[_-]?key|authorization|cookie|session_?key|private)/i;

function redactString(value) {
  return value
    .replace(/[A-Za-z]:[\\/]Users[\\/][^\s'",;]+/gi, MASK)
    .replace(/\/Users\/[^\s'",;]+/g, MASK)
    .replace(/\/home\/[^\s'",;]+/g, MASK)
    .replace(/\bTRAMORA_TEST_SECRET_\d+\b/g, MASK)
    .replace(/\bbearer\s+[^\s,;"]+/gi, `bearer=${MASK}`)
    // Key/value pairs in free text or serialized JSON. The value is consumed
    // through the closing quote or the end of the token, so a value containing
    // spaces (`{"password":"alpha beta"}`) is removed whole, not up to the first
    // space. Escaped quotes inside the value are handled by allowing \\".
    .replace(
      /((?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|token|secret|credential|cookie)["']?\s*[:=]\s*)("(?:[^"\\]|\\.)*"|'[^']*'|[^\s,;}]+)/gi,
      (match, prefix) => `${prefix}${MASK}`,
    );
}

function redactValue(value) {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    const copy = {};
    for (const [key, inner] of Object.entries(value)) {
      copy[key] = SENSITIVE_KEY.test(key) ? MASK : redactValue(inner);
    }
    return copy;
  }
  return value;
}

const shorten = (value, limit) => {
  if (value == null) return null;
  const redacted = redactValue(value);
  const text = typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
  return text.length > limit ? text.slice(0, limit) : text;
};

let payload = null;
let captureFailure = null;
try {
  const raw = fs.readFileSync(0, 'utf8').trim();
  if (raw) payload = JSON.parse(raw);
} catch {
  // The parser message quotes the rejected input, so it cannot be trusted with
  // arbitrary content: a secret without a recognisable label would survive
  // redaction. A fixed code is persisted instead of the message.
  captureFailure = 'parse_error';
}

const toolInput = payload && payload.tool_input;
const command = toolInput && !Array.isArray(toolInput) && typeof toolInput === 'object'
  ? shorten(toolInput.command, 2000)
  : shorten(toolInput, 2000);

const line = {
  hook_event: payload && payload.hook_event_name || 'unknown',
  ts: new Date().toISOString(),
  session_id: payload && payload.session_id || null,
  turn_id: payload && payload.turn_id || null,
  tool_use_id: payload && payload.tool_use_id || null,
  tool_name: payload && payload.tool_name || null,
  cwd: payload && payload.cwd
    ? `<${String(payload.cwd).replace(/[\\/]+$/, '').split(/[\\/]/).pop()}>`
    : null,
  command,
  response: payload && payload.tool_response != null ? shorten(payload.tool_response, 2000) : null,
};

// A malformed payload is recorded as a capture failure, never as an observed
// event: "unparseable input" and "event with unknown type" must not look alike.
// Only a fixed code is written; the rejected input and the parser message are not.
if (captureFailure) {
  line.capture_error = captureFailure;
  line.input_received = false;
}

fs.appendFileSync(out, JSON.stringify(line) + '\n');
