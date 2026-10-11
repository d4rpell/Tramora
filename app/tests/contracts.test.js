'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const C = require('../src/core/contracts');

test('Event identity is scoped by session (same tool_use_id in two sessions does not collide)', () => {
  const a = C.computeDedupKey({ source: 'hooks', session_id: 's1', source_event: 'PostToolUse', tool_use_id: 'tu:1' });
  const b = C.computeDedupKey({ source: 'hooks', session_id: 's2', source_event: 'PostToolUse', tool_use_id: 'tu:1' });
  assert.notEqual(a, b, 'same tool_use_id across sessions must differ');
  assert.match(a, /s1/);
  assert.match(b, /s2/);
});

test('Event identity keeps turn scope when turn_id is present', () => {
  const a = C.computeDedupKey({ source: 'hooks', session_id: 's1', source_event: 'PreToolUse', tool_use_id: 'tu:2', turn_id: 'turn:1' });
  const b = C.computeDedupKey({ source: 'hooks', session_id: 's1', source_event: 'PreToolUse', tool_use_id: 'tu:2', turn_id: 'turn:2' });
  assert.notEqual(a, b);
  assert.match(a, /turn:1/);
  assert.match(b, /turn:2/);
});

test('Missing occurrence id yields no dedup key (never deduplicated by absence)', () => {
  assert.equal(C.computeDedupKey({ source: 'hooks', session_id: 's1', source_event: 'SessionStart' }), null);
  const k1 = C.occurrenceDedupKey({ source: 'hooks', session_id: 's1', source_event: 'SessionStart', observed_at: '2026-10-11T00:00:00Z', actor: 'u' }, 1);
  const k2 = C.occurrenceDedupKey({ source: 'hooks', session_id: 's1', source_event: 'SessionStart', observed_at: '2026-10-11T00:00:00Z', actor: 'u' }, 2);
  assert.notEqual(k1, k2, 'occurrence index must distinguish legit repeats');
});

test('validateRecord: observed/generated dimensions are two independent axes', () => {
  C.validateRecord({ content_class: 'proposal', provenance: 'generated' });
  C.validateRecord({ content_class: 'proposal', provenance: 'observed', source: 'hooks' });
  assert.throws(() => C.validateRecord({ content_class: 'proposal', provenance: 'generated', source: 'hooks' }), /must not carry a source/);
  assert.throws(() => C.validateRecord({ content_class: 'proposal', provenance: 'observed' }), /requires source/);
});

test('validateRecord: human_decision requires observed + person + explicit record', () => {
  const valid = {
    content_class: 'human_decision',
    provenance: 'observed',
    source: 'hooks',
    actor_ref: 'person',
    human_decision_ref: 'input:42',
  };
  C.validateRecord(valid);
  // a generated human_decision is invalid (and generated must not carry a source)
  assert.throws(() => C.validateRecord({ ...valid, provenance: 'generated', source: undefined }), /human_decision requires provenance=observed/);
  assert.throws(() => C.validateRecord({ ...valid, actor_ref: 'agent' }), /actor_ref=person/);
  assert.throws(() => C.validateRecord({ ...valid, human_decision_ref: undefined }), /human_decision_ref/);
});

test('validateRecord: proposal is never promoted to human_decision by inference', () => {
  const proposal = { content_class: 'proposal', provenance: 'observed', source: 'hooks', actor_ref: 'agent' };
  C.validateRecord(proposal);
  assert.equal(proposal.content_class, 'proposal');
});

test('validateRecord: observed_result requires artifact/check ref', () => {
  assert.throws(() => C.validateRecord({ content_class: 'observed_result', provenance: 'observed', source: 'hooks' }), /artifact\/check ref/);
  C.validateRecord({ content_class: 'observed_result', provenance: 'observed', source: 'hooks', check_ref: 'tests:green' });
});

test('validateQuestion: task/session/event consistency constraint is enforced by registerQuestion (operations)', () => {
  // contract-level field checks
  assert.throws(() => C.validateQuestion({ id: 'q', task_ref: 't', session_ref: 's', event_ref: 'e', text: '', origin: 'user', depth: 'brief' }), /text/);
});

test('validateExplanation: observed_fact claims require navigable source_refs', () => {
  const base = {
    id: 'exp:1',
    question_ref: 'q:1',
    text: 'x',
    depth: 'brief',
    claims: [{ type: 'observed_fact', text: 'claim', source_refs: [] }],
    provenance: 'generated',
    generated_by: 'local-rules',
  };
  assert.throws(() => C.validateExplanation(base), /observed_fact claim requires navigable source_refs/);
  C.validateExplanation({ ...base, claims: [{ type: 'observed_fact', text: 'claim', source_refs: ['ev:1'] }] });
  C.validateExplanation({ ...base, claims: [{ type: 'open_question', text: 'q?', source_refs: [] }] });
});