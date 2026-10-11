'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../src/app');
const { normalize } = require('../src/capture/hooks-adapter');

function tempApp() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tramora-adapt-')), 't.db');
  const app = createApp({ file, secrets: [], permission: true, captureEnabled: true });
  app.createTask({ id: 'task:1', project_ref: 'p', title: 't', status: 'open' });
  app.createSession({ id: 'session:1', task_ref: 'task:1', source: 'hooks', started_at: '2026-10-11T00:00:00Z' });
  return app;
}

test('adapter: same occurrence re-delivered is deduplicated', () => {
  const app = tempApp();
  const ev = {
    id: 'ev:dup',
    session_id: 'session:1',
    kind: 'result',
    source_event: 'PostToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T00:01:00Z',
    tool_use_id: 'tu:dup',
    payload: { status: 'ok' },
  };
  const first = app.ingest(ev);
  assert.equal(first.duplicate, false);
  const second = app.ingest({ ...ev, id: 'ev:dup-again' });
  assert.equal(second.duplicate, true, 'same occurrence re-delivered must be deduplicated');
  assert.equal(app.listEvents('session:1').length, 1);
});

test('adapter: legitimate repeat of the same kind survives (distinct tool_use_ids)', () => {
  const app = tempApp();
  let count = 0;
  for (const toolUseId of ['tu:r1', 'tu:r2']) {
    app.ingest({
      id: `ev:r${count++}`,
      session_id: 'session:1',
      kind: 'action',
      source_event: 'PreToolUse',
      actor: 'coder',
      observed_at: '2026-10-11T00:02:00Z',
      tool_use_id: toolUseId,
      payload: { tool: 'read' },
    });
  }
  assert.equal(app.listEvents('session:1').length, 2, 'both legitimate occurrences must survive');
});

test('adapter: cross-session same tool_use_id does not collide', () => {
  const app = tempApp();
  app.createTask({ id: 'task:2', project_ref: 'p', title: 't2', status: 'open' });
  app.createSession({ id: 'session:2', task_ref: 'task:2', source: 'hooks', started_at: '2026-10-11T00:00:00Z' });
  const ev = (sessionId, id) => ({
    id,
    session_id: sessionId,
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T00:03:00Z',
    tool_use_id: 'tu:shared',
    payload: { tool: 'read' },
  });
  app.ingest(ev('session:1', 'ev:c1'));
  app.ingest(ev('session:2', 'ev:c2'));
  assert.equal(app.listEvents('session:1').length, 1);
  assert.equal(app.listEvents('session:2').length, 1);
});

test('adapter: missing occurrence id is not deduplicated by absence; identity uncertain', () => {
  const app = tempApp();
  const base = {
    session_id: 'session:1',
    kind: 'session',
    source_event: 'SessionStart',
    actor: 'user',
    observed_at: '2026-10-11T00:04:00Z',
    payload: {},
  };
  app.ingest({ ...base, id: 'ev:n1' });
  app.ingest({ ...base, id: 'ev:n2' });
  const events = app.listEvents('session:1').filter((e) => e.source_event === 'SessionStart');
  assert.equal(events.length, 2, 'both records are kept');
  assert.ok(events.every((e) => e.identity_confidence === 'uncertain'));
});

test('adapter: two turns of the same session are distinguished (turn_id in key)', () => {
  const app = tempApp();
  app.ingest({ id: 'ev:t1', session_id: 'session:1', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T00:05:00Z', tool_use_id: 'tu:t', turn_id: 'turn:1', payload: { tool: 'read' } });
  app.ingest({ id: 'ev:t2', session_id: 'session:1', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T00:06:00Z', tool_use_id: 'tu:t', turn_id: 'turn:2', payload: { tool: 'read' } });
  assert.equal(app.listEvents('session:1').length, 2);
});

test('adapter: secret values never reach storage (redaction before persist)', () => {
  const app = tempApp();
  app.ingest({
    id: 'ev:secret',
    session_id: 'session:1',
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T00:07:00Z',
    tool_use_id: 'tu:sec',
    payload: { token: 'TRAMORA_TEST_SECRET_7', note: 'keep' },
  });
  const stored = app.listEvents('session:1').find((e) => e.id === 'ev:secret');
  assert.doesNotMatch(JSON.stringify(stored.payload), /TRAMORA_TEST_SECRET_7/);
  assert.match(JSON.stringify(stored.payload), /\[redacted\]/);
  assert.equal(stored.payload.note, 'keep');
});

test('adapter: sensitive keys are masked by field name even when the secret value is unknown (secrets=[] default)', () => {
  const app = tempApp(); // secrets: [] — no known secret strings
  app.ingest({
    id: 'ev:sensitive',
    session_id: 'session:1',
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T00:10:00Z',
    tool_use_id: 'tu:sens',
    payload: {
      password: 'abc123',
      token: 'xyz789',
      token_list: ['tok1', 'tok2'],
      nested: { authorization: 'Bearer abc', api_key: 'k42', note: 'keep me' },
      text: 'Authorization: Bearer abc123XYZ remains masked',
    },
  });
  const stored = app.listEvents('session:1').find((e) => e.id === 'ev:sensitive');
  assert.equal(stored.payload.password, '[redacted]');
  assert.equal(stored.payload.token, '[redacted]');
  assert.deepEqual(stored.payload.nested.authorization, '[redacted]');
  assert.deepEqual(stored.payload.nested.api_key, '[redacted]');
  assert.equal(stored.payload.nested.note, 'keep me');
  assert.doesNotMatch(stored.payload.text, /abc123XYZ/, 'bearer token fully masked in free text');
  assert.doesNotMatch(JSON.stringify(stored.payload), /abc123XYZ/);
});

test('adapter: arrays under a sensitive key are fully masked', () => {
  const app = tempApp();
  app.ingest({
    id: 'ev:arr-token',
    session_id: 'session:1',
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T00:10:30Z',
    tool_use_id: 'tu:arr',
    payload: { token: ['tok1', 'tok2'], note: 'keep' },
  });
  const stored = app.listEvents('session:1').find((e) => e.id === 'ev:arr-token');
  assert.deepEqual(stored.payload.token, ['[redacted]', '[redacted]'], 'arrays under sensitive keys fully masked');
  assert.equal(stored.payload.note, 'keep');
});

test('adapter: PreToolUse and PostToolUse with the same tool_use_id keep distinct ids (no PK collision)', () => {
  const app = tempApp();
  // exercise normalize() itself (no raw.id): derived id must differ by source_event
  const pre = normalize({ session_id: 'session:1', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T00:11:00Z', tool_use_id: 'tu:same', payload: { tool: 'Bash' } });
  const post = normalize({ session_id: 'session:1', source_event: 'PostToolUse', actor: 'coder', observed_at: '2026-10-11T00:12:00Z', tool_use_id: 'tu:same', payload: { status: 'ok' } });
  assert.notEqual(pre.id, post.id, 'derived ids differ by source_event');
  app.ingest(pre);
  app.ingest(post);
  const events = app.listEvents('session:1');
  assert.equal(events.length, 2, 'both correlated events survive with distinct ids');
  assert.ok(events.some((e) => e.source_event === 'PreToolUse'));
  assert.ok(events.some((e) => e.source_event === 'PostToolUse'));
});

test('adapter: same tool_use_id in two different sessions does not collide on id (no raw.id)', () => {
  const app = tempApp();
  app.createTask({ id: 'task:2', project_ref: 'p', title: 't2', status: 'open' });
  app.createSession({ id: 'session:2', task_ref: 'task:2', source: 'hooks', started_at: '2026-10-11T00:00:00Z' });
  // normalize() derives the id; it must include the session, so both survive
  const ev = (sessionId) => normalize({ session_id: sessionId, source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T00:13:00Z', tool_use_id: 'tu:x', payload: { tool: 'read' } });
  app.ingest(ev('session:1'));
  app.ingest(ev('session:2'));
  assert.equal(app.listEvents('session:1').length, 1);
  assert.equal(app.listEvents('session:2').length, 1, 'same tool_use_id across sessions with no raw.id keeps both');
});

test('adapter: normalize derived id is unambiguous (no join-collision across tuple values)', () => {
  const a = normalize({ session_id: 'a', source_event: 'PreToolUse', tool_use_id: 'b:PreToolUse:c' });
  const b = normalize({ session_id: 'a:PreToolUse:b', source_event: 'PreToolUse', tool_use_id: 'c' });
  assert.notEqual(a.id, b.id, 'JSON-serialized tuple cannot collide when values contain separators');
});

test('adapter: two turns with the same tool_use_id get distinct derived ids (no raw.id)', () => {
  const app = tempApp();
  const t1 = normalize({ session_id: 'session:1', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T00:14:00Z', tool_use_id: 'tu:turn', turn_id: 'turn:1', payload: { tool: 'read' } });
  const t2 = normalize({ session_id: 'session:1', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T00:15:00Z', tool_use_id: 'tu:turn', turn_id: 'turn:2', payload: { tool: 'read' } });
  assert.notEqual(t1.id, t2.id, 'turn_id is part of the derived identity');
  app.ingest(t1);
  app.ingest(t2);
  assert.equal(app.listEvents('session:1').length, 2, 'both turns survive with distinct ids');
});

test('adapter: two captures without tool_use_id get distinct derived ids (identity uncertain)', () => {
  const app = tempApp();
  const base = { session_id: 'session:1', source_event: 'SessionStart', actor: 'user', observed_at: '2026-10-11T00:16:00Z', payload: {} };
  const a = normalize(base);
  const b = normalize(base);
  assert.notEqual(a.id, b.id, 'no stable id -> unique per capture (random suffix)');
  app.ingest(a);
  app.ingest(b);
  const events = app.listEvents('session:1').filter((e) => e.source_event === 'SessionStart');
  assert.equal(events.length, 2, 'both captures stored');
  assert.ok(events.every((e) => e.identity_confidence === 'uncertain'), 'identity flagged uncertain without a stable occurrence id');
});

test('adapter: loss with a documented delivery guarantee is declared as confirmed gap only with the signal', () => {
  // The light store does not invent gaps: with no close signal there is no loss diagnosis.
  const app = tempApp();
  app.ingest({ id: 'ev:open', session_id: 'session:1', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T00:08:00Z', tool_use_id: 'tu:open', payload: { tool: 'read' } });
  const events = app.listEvents('session:1');
  assert.ok(events.every((e) => e.status === 'captured'));
  assert.equal(events.length, 1);
});

test('adapter: capture stopped does not attribute new activity', () => {
  const app = tempApp();
  app.setCaptureEnabled(false);
  const result = app.ingest({ id: 'ev:stopped', session_id: 'session:1', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T00:09:00Z', tool_use_id: 'tu:stop', payload: {} });
  assert.equal(result.blocked, 'capture stopped');
  assert.equal(app.listEvents('session:1').length, 0, 'no new activity attributed while stopped');
});