'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../src/app');
const { wireHooks, SESSION_ID, TASK_ID } = require('../src/capture/fixture-hooks');

function tempDb() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tramora-test-')), 'tramora.db');
}

function freshApp() {
  const app = createApp({ file: tempDb(), secrets: [], permission: true, captureEnabled: true });
  wireHooks(app);
  return app;
}

test('store: persistence survives close/reopen (independent of panel lifetime)', () => {
  const file = tempDb();
  const app1 = createApp({ file, permission: true, captureEnabled: true });
  wireHooks(app1);
  assert.equal(app1.listEvents(SESSION_ID).length, 6);

  // Save a node and a mark, then close (new app on the same file).
  const ev = app1.listEvents(SESSION_ID).find((e) => e.kind === 'result');
  const q = app1.ask({ eventRef: ev.id, text: 'what happened?', depth: 'brief' });
  assert.ok(q.explanation, 'explanation should exist');
  const saved = app1.saveNode({
    id: 'node:persist',
    kind: 'concept',
    title: 'Persisted node',
    body: q.explanation.text,
    question_ref: q.question.id,
    explanation_ref: q.explanation.id,
    sources: [ev.id],
  });
  const node = saved.node;
  app1.mark({ nodeId: node.id, on: true, markedBy: 'local' });

  const app2 = createApp({ file, permission: true, captureEnabled: true });
  const node2 = app2.getNode('node:persist');
  assert.ok(node2, 'node recovered after reopen');
  assert.equal(node2.title, 'Persisted node');
  assert.equal(node2.question_ref, q.question.id);
  assert.equal(node2.explanation_ref, q.explanation.id);
  assert.deepEqual(node2.sources, [ev.id]);
  assert.equal(app2.listMarked().some((m) => m.node_ref === 'node:persist'), true);
});

test('store: two tasks do not mix records', () => {
  const app = freshApp();
  app.createTask({ id: 'task:2', project_ref: 'fixture-project', title: 'Second task', status: 'open' });
  app.createSession({ id: 'session:2', task_ref: 'task:2', source: 'hooks', started_at: '2026-10-11T09:00:00Z' });
  app.ingest({
    id: 'ev:2s',
    session_id: 'session:2',
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T09:00:10Z',
    tool_use_id: 'tu:other',
    payload: { tool: 'read' },
  });
  const task1Events = app.listEvents(SESSION_ID);
  assert.ok(task1Events.every((e) => e.task_ref === TASK_ID));
  const task2Session = app.listEvents('session:2');
  assert.equal(task2Session.length, 1);
  assert.equal(task2Session[0].task_ref, 'task:2');
});

test('store: storage failure is visible, not silent', () => {
  // opening a DB in a nonexistent directory throws immediately
  assert.throws(
    () => createApp({ file: path.join(os.tmpdir(), 'no-such-dir-unused', 'x.db'), captureEnabled: true }),
    /unable to open database file/i,
  );
});

test('store: writing errors are surfaced (wrapping)', () => {
  const app = freshApp();
  // ingest on a missing session must throw a visible error, not silently succeed
  assert.throws(() => app.ingest({ id: 'ev:orphan', session_id: 'session:none', kind: 'action', source_event: 'X', actor: 'a', payload: {} }));
});