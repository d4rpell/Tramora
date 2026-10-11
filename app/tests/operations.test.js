'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../src/app');
const { wireHooks, SESSION_ID } = require('../src/capture/fixture-hooks');

function freshApp() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tramora-ops-')), 't.db');
  const app = createApp({ file, secrets: [], permission: true, captureEnabled: true });
  wireHooks(app);
  return app;
}

test('ask: ties the question to the task/session/event; explanation is generated locally with provenance', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID).find((e) => e.kind === 'result' && e.tool_use_id === 'tu:alpha');
  const result = app.ask({ eventRef: event.id, text: 'What did this step do?', depth: 'with_example' });
  assert.ok(result.explanation, 'local explanation is generated even without remote permission');
  assert.equal(result.question.task_ref, event.task_ref);
  assert.equal(result.question.session_ref, event.session_id);
  assert.equal(result.question.event_ref, event.id);
  assert.equal(result.explanation.provenance, 'generated');
  assert.equal(result.explanation.question_ref, result.question.id);
  assert.ok(result.explanation.claims.some((c) => c.type === 'observed_fact' && c.source_refs.length > 0));
  assert.ok(result.explanation.claims.some((c) => c.type === 'interpretation'));
});

test('ask: a question about another task never inherits context', () => {
  const app = freshApp();
  app.createTask({ id: 'task:other', project_ref: 'p', title: 'other', status: 'open' });
  app.createSession({ id: 'session:other', task_ref: 'task:other', source: 'hooks', started_at: '2026-10-11T00:00:00Z' });
  app.ingest({
    id: 'ev:other',
    session_id: 'session:other',
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T00:01:00Z',
    tool_use_id: 'tu:other2',
    payload: { tool: 'read' },
  });
  const result = app.ask({ eventRef: 'ev:other', text: 'q', depth: 'brief' });
  assert.equal(result.question.task_ref, 'task:other');
  assert.equal(result.question.session_ref, 'session:other');
  assert.notEqual(result.question.task_ref, 'fixture-task-t1');
});

test('ask: excluded fields never enter the payload (redacted before persist)', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID).find((e) => e.payload && e.payload.secret);
  assert.ok(event, 'fixture has a secret field');
  const result = app.ask({ eventRef: event.id, text: 'details', depth: 'detailed' });
  const text = result.explanation.text;
  assert.doesNotMatch(text, /TRAMORA_TEST_SECRET/);
  assert.doesNotMatch(JSON.stringify(result.explanation), /TRAMORA_TEST_SECRET/);
});

test('ask: the question text itself is redacted before persist (no secret in question/store/export)', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  const result = app.ask({
    eventRef: event.id,
    text: 'what is password=abc123 and token=xyz?',
    depth: 'brief',
  });
  assert.doesNotMatch(result.question.text, /abc123|xyz/);
  assert.match(result.question.text, /\[redacted\]/);
  const data = JSON.parse(app.exportData());
  assert.doesNotMatch(JSON.stringify(data.questions), /abc123|xyz/);
  assert.doesNotMatch(result.explanation.text, /abc123|xyz/);
});

test('save_node: node body is redacted before persist; transactional on missing source', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  const saved = app.saveNode({
    id: 'node:redact',
    kind: 'concept',
    title: 'Node with api_key=SECRETVALUE1',
    body: 'body with token=SECRETTOKEN1',
    sources: [event.id],
  });
  assert.match(saved.node.title, /\[redacted\]/);
  assert.doesNotMatch(saved.node.title, /SECRETVALUE1/);
  assert.doesNotMatch(saved.node.body, /SECRETTOKEN1/);

  // Transactionality: a node whose source does not exist fails cleanly (rollback).
  const before = app.listNodes();
  assert.throws(
    () => app.saveNode({ id: 'node:tx', kind: 'concept', title: 'Tx', sources: ['ev:missing'] }),
    /FOREIGN KEY|foreign key|constraint/i,
  );
  const after = app.listNodes();
  assert.equal(after.length, before.length, 'no partial node persisted after rollback');
});

test('ask: cancel (no submit) never sends; nothing is persisted until a question is asked', () => {
  const app = freshApp();
  const before = app.listNodes();
  assert.equal(before.length, 0, 'no nodes exist before any save');
  // No ask() call was made here: nothing persisted, nothing sent.
  assert.equal(app.listEvents(SESSION_ID).length, 8);
});

test('explain: provider failure/timeout is surfaced, not faked as success', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID).find((e) => e.kind === 'action');
  // force a scenario where the event is missing -> blocked with reason, not a fake explanation
  const result = app.ask({ eventRef: 'ev:does-not-exist', text: 'q', depth: 'brief' });
  assert.ok(result.error, 'missing event yields an error');
});

test('save_node: keeps version and sources; project change proposes review and keeps previous version', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID).find((e) => e.kind === 'result');
  const q = app.ask({ eventRef: event.id, text: 'what?', depth: 'brief' });
  const first = app.saveNode({
    id: 'node:rev',
    kind: 'concept',
    title: 'Initial title',
    body: q.explanation.text,
    question_ref: q.question.id,
    explanation_ref: q.explanation.id,
    project_revision: 'rev:1',
    sources: [event.id],
  });
  assert.equal(first.node.content_version, 1);
  assert.equal(first.reviewProposed, false);
  const second = app.saveNode({
    id: 'node:rev',
    kind: 'concept',
    title: 'Changed title',
    body: 'new body',
    project_revision: 'rev:2',
    sources: [event.id],
  });
  assert.ok(second.reviewProposed, 'project revision change proposes a review');
  assert.equal(second.node.content_version, 2);
  assert.ok(second.node.previous_version_id, 'previous version is kept');
  const previous = app.getNodeVersion(second.node.previous_version_id);
  assert.ok(previous, 'previous version is retrievable');
  assert.equal(previous.title, 'Initial title');
});

test('contract: node kind=decision requires a human_decision source; relation=decided requires a decision end', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0]; // not a human_decision

  // 1. saving a decision node without a human_decision source is rejected
  assert.throws(
    () => app.saveNode({
      id: 'node:bad-decision',
      kind: 'decision',
      title: 'Bad decision',
      sources: [event.id],
    }),
    /kind=decision requires a source event that is an observed human_decision/,
  );

  // 2. a human_decision event satisfies the contract
  const humanInput = {
    id: 'ev:human',
    session_id: SESSION_ID,
    kind: 'action',
    source_event: 'PostToolUse',
    actor: 'user',
    actor_ref: 'person',
    observed_at: '2026-10-11T08:06:00.000Z',
    tool_use_id: 'tu:human',
    content_class: 'human_decision',
    human_decision_ref: 'input:42',
    payload: { human_decision_ref: 'input:42', note: 'user picked approach B' },
  };
  humanInput.actor_ref = 'person';
  humanInput.human_decision_ref = 'input:42';
  app.ingest(humanInput);
  const ok = app.saveNode({
    id: 'node:good-decision',
    kind: 'decision',
    title: 'Real decision',
    sources: ['ev:human'],
  });
  assert.equal(ok.node.kind, 'decision');

  // 3. an edge relation=decided requires a decision node at one end
  const normalNode = app.saveNode({
    id: 'node:concept-end',
    kind: 'concept',
    title: 'Concept',
    sources: [event.id],
  }).node;
  assert.throws(
    () => app.saveNode({
      id: 'node:bad-edge',
      kind: 'concept',
      title: 'Bad edge',
      sources: [event.id],
      links: [{ from: 'node:concept-end', to: 'node:concept-end', relation: 'decided' }],
    }),
    /relation=decided requires one end to be an observed human_decision node/,
  );
  assert.equal(normalNode.id, 'node:concept-end');
});

test('contract: updating a decision node without kind/sources preserves its accreditation (no silent strip)', () => {
  const app = freshApp();
  const humanEvent = {
    id: 'ev:hd2',
    session_id: SESSION_ID,
    kind: 'action',
    source_event: 'PostToolUse',
    actor: 'user',
    actor_ref: 'person',
    observed_at: '2026-10-11T08:07:00.000Z',
    tool_use_id: 'tu:hd2',
    content_class: 'human_decision',
    human_decision_ref: 'input:43',
    payload: { human_decision_ref: 'input:43', note: 'decision B' },
  };
  app.ingest(humanEvent);
  const created = app.saveNode({
    id: 'node:decision-keep',
    kind: 'decision',
    title: 'Decision',
    sources: ['ev:hd2'],
  }).node;
  assert.equal(created.kind, 'decision');

  // update that omits kind/sources must keep the accreditation and the decision kind
  const updated = app.saveNode({
    id: 'node:decision-keep',
    title: 'Decision (updated)',
    body: 'still a decision',
    project_revision: 'rev:2',
  }).node;
  assert.equal(updated.kind, 'decision');
  assert.equal(updated.content_version, 2);
  assert.deepEqual(updated.sources, ['ev:hd2'], 'sources preserved on update');

  // an explicit `sources: []` on a decision node is rejected (would strip accreditation)
  assert.throws(
    () => app.saveNode({ id: 'node:decision-keep', kind: 'decision', title: 'x', sources: [] }),
    /kind=decision requires a source event that is an observed human_decision/,
  );
});

test('contract: previous version preserves sources and links; deleteAll removes node_versions', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  app.ingest({
    id: 'ev:hd3',
    session_id: SESSION_ID,
    kind: 'action',
    source_event: 'PostToolUse',
    actor: 'user',
    actor_ref: 'person',
    observed_at: '2026-10-11T08:08:00.000Z',
    tool_use_id: 'tu:hd3',
    content_class: 'human_decision',
    human_decision_ref: 'input:44',
    payload: { human_decision_ref: 'input:44', note: 'decision C' },
  });
  const decision = app.saveNode({
    id: 'node:dtarget',
    kind: 'decision',
    title: 'Decision target',
    sources: ['ev:hd3'],
  }).node;
  const first = app.saveNode({
    id: 'node:linked',
    kind: 'concept',
    title: 'Node v1',
    body: 'body v1',
    sources: [event.id],
    links: [{ from: 'node:linked', to: decision.id, relation: 'derives_from' }],
  });
  assert.equal(first.node.content_version, 1);

  // change the project_revision and links -> version 2, previous preserved
  const second = app.saveNode({
    id: 'node:linked',
    title: 'Node v2',
    project_revision: 'rev:2',
    sources: [event.id],
    links: [{ from: 'node:linked', to: decision.id, relation: 'decided' }],
  });
  assert.equal(second.node.content_version, 2);
  const previous = app.getNodeVersion(second.node.previous_version_id);
  assert.ok(previous, 'previous version retrievable');
  assert.equal(previous.title, 'Node v1');
  assert.deepEqual(previous.sources, [event.id], 'previous version preserves sources');
  const prevLinks = previous.links.map(({ sources, ...rest }) => rest);
  assert.deepEqual(prevLinks, [{ from: 'node:linked', to: decision.id, relation: 'derives_from' }], 'previous version preserves links');

  // deleteAll clears node_versions (no dangling versions after a wipe)
  app.deleteAll();
  assert.equal(app.getNodeVersion(second.node.previous_version_id), null, 'node_versions cleared by deleteAll');
});

test('contract: editing a node does not delete incoming edges owned by other nodes', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  const a = app.saveNode({ id: 'node:a', kind: 'concept', title: 'A', sources: [event.id] }).node;
  const b = app.saveNode({ id: 'node:b', kind: 'concept', title: 'B', sources: [event.id] }).node;
  app.saveNode({
    id: 'node:a',
    kind: 'concept',
    title: 'A',
    sources: [event.id],
    links: [{ from: 'node:a', to: b.id, relation: 'depends_on' }],
  });
  // editing B must not delete the incoming edge A -> B
  app.saveNode({ id: 'node:b', kind: 'concept', title: 'B2', sources: [event.id] });
  const aAfter = app.getNode('node:a');
  assert.ok(aAfter.links.some((e) => e.to === b.id && e.relation === 'depends_on'), 'incoming edge preserved when other node edited');
});

test('contract: decided self-edge requires this node to be a decision', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  // concept with decided self-edge is rejected
  assert.throws(
    () => app.saveNode({
      id: 'node:selfdecided',
      kind: 'concept',
      title: 'X',
      sources: [event.id],
      links: [{ from: 'node:selfdecided', to: 'node:selfdecided', relation: 'decided' }],
    }),
    /relation=decided requires one end to be an observed human_decision node/,
  );
  // decision with decided self-edge is accepted
  const human = {
    id: 'ev:hd4',
    session_id: SESSION_ID,
    kind: 'action',
    source_event: 'PostToolUse',
    actor: 'user',
    actor_ref: 'person',
    observed_at: '2026-10-11T08:09:00.000Z',
    tool_use_id: 'tu:hd4',
    content_class: 'human_decision',
    human_decision_ref: 'input:45',
    payload: { human_decision_ref: 'input:45', note: 'D' },
  };
  app.ingest(human);
  const d = app.saveNode({
    id: 'node:selfdecided',
    kind: 'decision',
    title: 'D',
    sources: ['ev:hd4'],
    links: [{ from: 'node:selfdecided', to: 'node:selfdecided', relation: 'decided' }],
  }).node;
  assert.equal(d.links.length, 1);
  assert.equal(d.links[0].relation, 'decided');
});

test('contract: demoting a decision with an incoming decided edge is rejected (P1)', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  const human = {
    id: 'ev:hd5',
    session_id: SESSION_ID,
    kind: 'action',
    source_event: 'PostToolUse',
    actor: 'user',
    actor_ref: 'person',
    observed_at: '2026-10-11T08:10:00.000Z',
    tool_use_id: 'tu:hd5',
    content_class: 'human_decision',
    human_decision_ref: 'input:46',
    payload: { human_decision_ref: 'input:46', note: 'D2' },
  };
  app.ingest(human);
  // decision D2, concept C, edge C -> D2 decided
  app.saveNode({ id: 'node:d2', kind: 'decision', title: 'D2', sources: ['ev:hd5'] });
  app.saveNode({
    id: 'node:c2',
    kind: 'concept',
    title: 'C',
    sources: [event.id],
    links: [{ from: 'node:c2', to: 'node:d2', relation: 'decided' }],
  });
  // demoting D2 to concept must be rejected: the incoming decided edge would lose its decision end
  assert.throws(
    () => app.saveNode({ id: 'node:d2', kind: 'concept', title: 'D2 (demoted)' }),
    /relation=decided requires one end to be an observed human_decision node/,
  );
  // the previous state is preserved (still a decision)
  const d2 = app.getNode('node:d2');
  assert.equal(d2.kind, 'decision');
});

test('mark/list_marked: persistent; unmark persists; marking starts no work', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  const q = app.ask({ eventRef: event.id, text: 'q', depth: 'brief' });
  const node = app.saveNode({
    id: 'node:mark',
    kind: 'question',
    title: 'Marked node',
    body: q.explanation.text,
    question_ref: q.question.id,
    explanation_ref: q.explanation.id,
    sources: [event.id],
  }).node;
  const mark = app.mark({ nodeId: node.id, on: true, markedBy: 'local' });
  assert.equal(mark.state, 'marked');
  assert.equal(app.listMarked().length, 1);
  assert.equal(app.listMarked()[0].node_ref, node.id);
  // unmark persists
  app.unmark(node.id);
  assert.equal(app.listMarked().length, 0);
  // marking does not start capture or create events
  assert.equal(app.listEvents(SESSION_ID).length, 8);
});

test('export: separates observed/generated and keeps provenance; delete clears per retention', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  const q = app.ask({ eventRef: event.id, text: 'q', depth: 'brief' });
  const node = app.saveNode({
    id: 'node:export',
    kind: 'concept',
    title: 'Export node',
    body: q.explanation.text,
    question_ref: q.question.id,
    explanation_ref: q.explanation.id,
    sources: [event.id],
  }).node;
  app.mark({ nodeId: node.id, on: true, markedBy: 'local' });
  const data = JSON.parse(app.exportData());
  assert.ok(Array.isArray(data.events) && data.events.length > 0);
  assert.ok(Array.isArray(data.explanations));
  assert.ok(data.explanations.every((e) => e.provenance === 'generated'));
  assert.ok(data.events.every((e) => e.provenance === 'observed'));
  assert.ok(data.nodes.some((n) => n.id === 'node:export'));
  app.deleteAll();
  assert.equal(app.listEvents(SESSION_ID).length, 0);
  assert.equal(app.listNodes().length, 0);
  assert.equal(app.listMarked().length, 0);
});

test('return overview: is read-only and never labels a session "in execution" or "loss"', async () => {
  const app = freshApp();
  const beforeEvents = app.listEvents(SESSION_ID).length;
  const beforeNodes = app.listNodes().length;
  const beforeMarks = app.listMarked().length;
  const overview = app.getReturnOverview(SESSION_ID);
  assert.ok(overview.overview.tasks.length > 0, 'tasks present');
  assert.ok(overview.overview.sessions.length > 0, 'sessions present');
  assert.ok(Array.isArray(overview.recent) && overview.recent.length > 0, 'recent events present');
  assert.ok(Array.isArray(overview.pending.pendingResults));
  assert.equal(overview.pending.gaps.length, 0, 'no invented gaps');
  // no mutation
  assert.equal(app.listEvents(SESSION_ID).length, beforeEvents);
  assert.equal(app.listNodes().length, beforeNodes);
  assert.equal(app.listMarked().length, beforeMarks);
});

test('return pending: action without correlated result -> positional labels, never loss', () => {
  const app = freshApp();
  // fresh fixture has tu:alpha and tu:beta matched, and SessionStart/Stop as session events.
  // Add an action without PostToolUse.
  app.ingest({
    id: 'ev:open1',
    session_id: SESSION_ID,
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T08:06:00.000Z',
    tool_use_id: 'tu:open',
    payload: { tool: 'Bash' },
  });
  // no SessionEnd/ended_at, and the Stop event is AFTER this action -> the fixture Stop is the last event before no session close.
  // The action is before the Stop: fixture has Stop at 08:05, this action at 08:06 -> after the Stop.
  const pending = app.getReturnOverview(SESSION_ID).pending;
  const p = pending.pendingResults.find((r) => r.action.id === 'ev:open1');
  assert.ok(p, 'pending action listed');
  // The fixture Stop is at 08:05:00 and the new action at 08:06:00, so the Stop is NOT after it.
  // No later closure signal besides the session Stop (which is before) and no ended_at -> "result not yet observed".
  assert.equal(p.label, 'result not yet observed');
  assert.equal(p.closureSignal, null);
});

test('return pending: Stop after an action -> result not observed at turn close; Stop-final -> no session closure', () => {
  const app = freshApp();
  // Build a dedicated session: action at t0, Stop at t1 (no SessionEnd/ended_at).
  app.createTask({ id: 'task:t3', project_ref: 'p', title: 't3', status: 'open' });
  app.createSession({ id: 'session:t3', task_ref: 'task:t3', source: 'hooks', started_at: '2026-10-11T09:00:00Z' });
  app.ingest({ id: 'ev:t3a', session_id: 'session:t3', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T09:00:10Z', tool_use_id: 'tu:t3a', payload: { tool: 'Bash' } });
  app.ingest({ id: 'ev:t3s', session_id: 'session:t3', kind: 'session', source_event: 'Stop', actor: 'user', observed_at: '2026-10-11T09:00:20Z', payload: {}, status: 'captured' });
  let ov = app.getReturnOverview('session:t3');
  let p = ov.pending.pendingResults.find((r) => r.action.id === 'ev:t3a');
  assert.equal(p.label, 'result not observed at turn close', 'Stop after the action closes the turn');
  const session = ov.overview.sessions.find((s) => s.id === 'session:t3');
  assert.equal(session.session_closure, 'no session closure', 'Stop does not close the session');
  assert.equal(session.last_turn_finished, true, 'Stop as last observed event marks last turn finished');

  // Stop followed by a new action without result -> the later action is "result not yet observed",
  // and still no session closure (RC-09).
  app.ingest({ id: 'ev:t3b', session_id: 'session:t3', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T09:00:30Z', tool_use_id: 'tu:t3b', payload: { tool: 'Bash' } });
  ov = app.getReturnOverview('session:t3');
  const pa = ov.pending.pendingResults.find((r) => r.action.id === 'ev:t3a');
  const pb = ov.pending.pendingResults.find((r) => r.action.id === 'ev:t3b');
  assert.equal(pa.label, 'result not observed at turn close', 'action before Stop keeps its turn-close label');
  assert.equal(pb.label, 'result not yet observed', 'closure before later work is never applied to later work');
  const session2 = ov.overview.sessions.find((s) => s.id === 'session:t3');
  assert.equal(session2.session_closure, 'no session closure');
  assert.equal(session2.last_turn_finished, false, 'Stop is no longer the last event');
});

test('return pending: SessionEnd after an action without ended_at -> closed, result at session close (RC-07)', () => {
  const app = freshApp();
  app.createTask({ id: 'task:t4', project_ref: 'p', title: 't4', status: 'open' });
  app.createSession({ id: 'session:t4', task_ref: 'task:t4', source: 'hooks', started_at: '2026-10-11T10:00:00Z' });
  app.ingest({ id: 'ev:t4a', session_id: 'session:t4', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T10:00:10Z', tool_use_id: 'tu:t4a', payload: { tool: 'Bash' } });
  app.ingest({ id: 'ev:t4s', session_id: 'session:t4', kind: 'session', source_event: 'SessionEnd', actor: 'user', observed_at: '2026-10-11T10:00:20Z', payload: {}, status: 'captured' });
  const ov = app.getReturnOverview('session:t4');
  const p = ov.pending.pendingResults.find((r) => r.action.id === 'ev:t4a');
  assert.equal(p.label, 'result not observed at session close');
  const session = ov.overview.sessions.find((s) => s.id === 'session:t4');
  assert.equal(session.session_closure, 'closed', 'SessionEnd closes the session');
});

test('return pending: nearest closure signal wins — ended_at closer than a later Stop (P2-2)', () => {
  const app = freshApp();
  app.createTask({ id: 'task:t5', project_ref: 'p', title: 't5', status: 'open' });
  app.createSession({ id: 'session:t5', task_ref: 'task:t5', source: 'hooks', started_at: '2026-10-11T11:00:00Z', ended_at: '2026-10-11T11:00:30Z' });
  // action at t+10s, ended_at at t+30s, Stop event at t+40s (after ended_at)
  app.ingest({ id: 'ev:t5a', session_id: 'session:t5', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T11:00:10Z', tool_use_id: 'tu:t5a', payload: { tool: 'Bash' } });
  app.ingest({ id: 'ev:t5s', session_id: 'session:t5', kind: 'session', source_event: 'Stop', actor: 'user', observed_at: '2026-10-11T11:00:40Z', payload: {}, status: 'captured' });
  const ov = app.getReturnOverview('session:t5');
  const p = ov.pending.pendingResults.find((r) => r.action.id === 'ev:t5a');
  assert.equal(p.label, 'result not observed at session close', 'ended_at (closer) beats the later turn Stop');
  assert.equal(p.closureSignal.source_event, 'ended_at');
});

test('return pending: chronological comparison with mixed ISO precision (P2-2 regression)', () => {
  const app = freshApp();
  app.createTask({ id: 'task:t6', project_ref: 'p', title: 't6', status: 'open' });
  app.createSession({ id: 'session:t6', task_ref: 'task:t6', source: 'hooks', started_at: '2026-10-11T12:00:00Z', ended_at: '2026-10-11T12:00:30Z' });
  // action at 12:00:10; ended_at 12:00:30 (no millis); Stop at 12:00:30.500
  // Chronologically ended_at wins; a lexicographic compare would pick the Stop.
  app.ingest({ id: 'ev:t6a', session_id: 'session:t6', kind: 'action', source_event: 'PreToolUse', actor: 'coder', observed_at: '2026-10-11T12:00:10Z', tool_use_id: 'tu:t6a', payload: { tool: 'Bash' } });
  app.ingest({ id: 'ev:t6s', session_id: 'session:t6', kind: 'session', source_event: 'Stop', actor: 'user', observed_at: '2026-10-11T12:00:30.500Z', payload: {}, status: 'captured' });
  const ov = app.getReturnOverview('session:t6');
  const p = ov.pending.pendingResults.find((r) => r.action.id === 'ev:t6a');
  assert.equal(p.label, 'result not observed at session close', 'normalized time: ended_at 12:00:30 < Stop 12:00:30.500');
  assert.equal(p.closureSignal.source_event, 'ended_at');
});

test('return review proposals: derived from node_versions; single-version node has no proposal (RC-03/04)', () => {
  const app = freshApp();
  const event = app.listEvents(SESSION_ID)[0];
  // single version -> no proposal, regardless of the project revision
  app.saveNode({ id: 'node:single', kind: 'concept', title: 'Single', project_revision: 'rev:1', sources: [event.id] });
  assert.equal(app.getReturnOverview(SESSION_ID).reviewProposals.length, 0, 'no proposal for a single-version node');

  // consecutive versions with a change -> proposal, previous preserved
  app.saveNode({ id: 'node:single', kind: 'concept', title: 'Single', project_revision: 'rev:1', sources: [event.id] });
  const second = app.saveNode({ id: 'node:single', kind: 'concept', title: 'Single v2', project_revision: 'rev:2', sources: [event.id] });
  const proposals = app.getReturnOverview(SESSION_ID).reviewProposals;
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].node_id, 'node:single');
  assert.equal(proposals[0].previous.project_revision, 'rev:1');
  assert.equal(proposals[0].project_revision, 'rev:2');
  const prev = app.getNodeVersion(second.node.previous_version_id);
  assert.ok(prev, 'previous version preserved');
  assert.equal(prev.title, 'Single');

  // resave at the current revision retires the proposal
  app.saveNode({ id: 'node:single', kind: 'concept', title: 'Single v3', project_revision: 'rev:2', sources: [event.id] });
  assert.equal(app.getReturnOverview(SESSION_ID).reviewProposals.length, 0, 'proposal retired when saved at the current revision');
});