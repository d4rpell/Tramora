'use strict';

const MASK = '[redacted]';

// Sensitive field names: values under these keys are masked regardless of
// whether the exact secret string is known (defense in depth; spec §4).
const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'secret', 'token', 'access_token', 'refresh_token',
  'api_key', 'apikey', 'api-key', 'authorization', 'auth', 'cookie', 'session',
]);

function isSensitiveKey(key) {
  if (typeof key !== 'string') return false;
  const k = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return SENSITIVE_KEYS.has(k) || k.endsWith('_secret') || k.endsWith('_token');
}

function makeRedactor({ secrets = [] } = {}) {
  const secretValues = [...new Set(secrets.filter((s) => typeof s === 'string' && s.length > 0))];
  const testSecretPattern = /\bTRAMORA_TEST_SECRET_\d+\b/g;

  function redactString(value) {
    let out = value;
    for (const secret of secretValues) out = out.split(secret).join(MASK);
    // Credentials in free text: mask the bearer token first (it would leave a
    // residue if the label alternation consumed "Authorization: Bearer" only),
    // then label:value pairs.
    out = out.replace(/\bbearer\s+[^\s,;]+/gi, 'bearer=' + MASK);
    out = out.replace(/(authorization|api[_-]?key|access_token|refresh_token|password|passwd|token|secret)\s*[:=]\s*[^\s,;]+/gi, (match, key) => `${key}=${MASK}`);
    out = out.replace(testSecretPattern, MASK);
    return out;
  }

  function redactValue(value, key) {
    // Mask any value under a sensitive key BEFORE discriminating its type,
    // so arrays/scalars under `token`/`password`/... are fully masked too.
    if (isSensitiveKey(key)) return Array.isArray(value) ? value.map(() => MASK) : MASK;
    if (typeof value === 'string') return redactString(value);
    if (Array.isArray(value)) return value.map((v) => redactValue(v, undefined));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = redactValue(v, k);
      return out;
    }
    return value;
  }

  return redactValue;
}

module.exports = { makeRedactor, MASK };