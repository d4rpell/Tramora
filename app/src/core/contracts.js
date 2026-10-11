'use strict';

const SCHEMA_VERSION = '1';

const PROVENANCE = Object.freeze({
  OBSERVED: 'observed',
  GENERATED: 'generated',
});

const CONTENT_CLASS = Object.freeze({
  PROPOSAL: 'proposal',
  HUMAN_DECISION: 'human_decision',
  ACKNOWLEDGMENT: 'acknowledgment',
  OBSERVED_RESULT: 'observed_result',
  INTERPRETATION: 'interpretation',
  ILLUSTRATIVE_EXAMPLE: 'illustrative_example',
  OPEN_QUESTION: 'open_question',
  CONCEPT: 'concept',
  OUTCOME: 'outcome',
});

const CLAIM_TYPE = Object.freeze({
  OBSERVED_FACT: 'observed_fact',
  INTERPRETATION: 'interpretation',
  ILLUSTRATIVE_EXAMPLE: 'illustrative_example',
  OPEN_QUESTION: 'open_question',
});

const EVENT_KIND = Object.freeze({
  ACTION: 'action',
  RESULT: 'result',
  DELEGATION: 'delegation',
  SESSION: 'session',
});

const EVENT_STATUS = Object.freeze({
  CAPTURED: 'captured',
  UNKNOWN_COVERAGE: 'unknown_coverage',
});

const IDENTITY_CONFIDENCE = Object.freeze({
  DETERMINISTIC: 'deterministic',
  UNCERTAIN: 'uncertain',
});

const DEPTH = Object.freeze({
  BRIEF: 'brief',
  WITH_EXAMPLE: 'with_example',
  DETAILED: 'detailed',
});

const QUESTION_ORIGIN = Object.freeze({
  USER: 'user',
  SUGGESTED: 'suggested',
});

const NODE_KIND = Object.freeze({
  CONCEPT: 'concept',
  QUESTION: 'question',
  DECISION: 'decision',
  OUTCOME: 'outcome',
});

const EDGE_RELATION = Object.freeze({
  EXPLAINS: 'explains',
  DEPENDS_ON: 'depends_on',
  CONTRADICTS: 'contradicts',
  DECIDED: 'decided',
  DERIVES_FROM: 'derives_from',
  PROPOSES: 'proposes',
});

const MARK_STATE = Object.freeze({
  MARKED: 'marked',
  UNMARKED: 'unmarked',
});

const COVERAGE = Object.freeze({
  CAPTURED: 'captured',
  UNKNOWN: 'unknown_coverage',
  STOPPED: 'capture stopped',
  NO_PERMISSION: 'no permission',
  GAP: 'gap',
});

function assert(cond, message) {
  if (!cond) throw new TypeError(message);
}

function oneOf(enumObj, value, label) {
  return Object.values(enumObj).includes(value) || (() => { throw new TypeError(`invalid ${label}: ${value}`); })();
}

function validateEvent(ev) {
  assert(ev && typeof ev.id === 'string' && ev.id.length > 0, 'event.id required');
  assert(typeof ev.session_id === 'string' && ev.session_id.length > 0, 'event.session_id required');
  oneOf(EVENT_KIND, ev.kind, 'event.kind');
  assert(ev.provenance === PROVENANCE.OBSERVED, 'Event must be provenance=observed');
  assert(typeof ev.source === 'string' && ev.source.length > 0, 'observed event requires source');
  assert(typeof ev.source_event === 'string' && ev.source_event.length > 0, 'event.source_event required');
  oneOf(EVENT_STATUS, ev.status, 'event.status');
  oneOf(IDENTITY_CONFIDENCE, ev.identity_confidence, 'identity_confidence');
  assert(typeof ev.dedup_key === 'string' && ev.dedup_key.length > 0, 'event.dedup_key required');
  if (ev.observed_at != null) assert(typeof ev.observed_at === 'string', 'event.observed_at must be an ISO string');
  if (ev.recipient != null) assert(typeof ev.recipient === 'string', 'event.recipient must be a string');
  if (ev.actor != null) assert(typeof ev.actor === 'string', 'event.actor must be a string');
  return ev;
}

function validateRecord(record) {
  assert(record && typeof record === 'object', 'record required');
  oneOf(CONTENT_CLASS, record.content_class, 'content_class');
  oneOf(PROVENANCE, record.provenance, 'provenance');
  if (record.provenance === PROVENANCE.OBSERVED) {
    assert(typeof record.source === 'string', 'observed record requires source (the connector)');
  } else {
    assert(record.source == null, 'generated record must not carry a source');
  }
  if (record.content_class === CONTENT_CLASS.HUMAN_DECISION) {
    assert(record.provenance === PROVENANCE.OBSERVED, 'human_decision requires provenance=observed');
    assert(record.actor_ref === 'person', 'human_decision requires actor_ref=person');
    assert(typeof record.human_decision_ref === 'string' && record.human_decision_ref.length > 0, 'human_decision requires human_decision_ref');
  }
  if (record.content_class === CONTENT_CLASS.OBSERVED_RESULT) {
    assert(record.check_ref || record.artifact_ref, 'observed_result requires an artifact/check ref');
  }
  return record;
}

function validateQuestion(q) {
  assert(q && typeof q.id === 'string' && q.id.length > 0, 'question.id required');
  assert(typeof q.task_ref === 'string' && q.task_ref.length > 0, 'question.task_ref required');
  assert(typeof q.session_ref === 'string' && q.session_ref.length > 0, 'question.session_ref required');
  assert(typeof q.event_ref === 'string' && q.event_ref.length > 0, 'question.event_ref required');
  assert(typeof q.text === 'string' && q.text.length > 0, 'question.text required');
  oneOf(QUESTION_ORIGIN, q.origin, 'question.origin');
  oneOf(DEPTH, q.depth, 'question.depth');
  return q;
}

function validateExplanation(exp) {
  assert(exp && typeof exp.id === 'string' && exp.id.length > 0, 'explanation.id required');
  assert(typeof exp.question_ref === 'string' && exp.question_ref.length > 0, 'explanation.question_ref required');
  assert(typeof exp.text === 'string' && exp.text.length > 0, 'explanation.text required');
  oneOf(DEPTH, exp.depth, 'explanation.depth');
  assert(Array.isArray(exp.claims), 'explanation.claims must be an array');
  for (const claim of exp.claims) {
    oneOf(CLAIM_TYPE, claim.type, 'claim.type');
    assert(typeof claim.text === 'string' && claim.text.length > 0, 'claim.text required');
    assert(Array.isArray(claim.source_refs), 'claim.source_refs must be an array');
    if (claim.type === CLAIM_TYPE.OBSERVED_FACT) {
      assert(claim.source_refs.length > 0, 'observed_fact claim requires navigable source_refs');
    }
  }
  assert(exp.provenance === PROVENANCE.GENERATED, 'explanation must be provenance=generated');
  assert(typeof exp.generated_by === 'string', 'explanation.generated_by required');
  return exp;
}

function computeDedupKey({ source, session_id, source_event, tool_use_id, turn_id }) {
  if (!tool_use_id) return null;
  // JSON-serialized tuple: unambiguous even if a value contains the separator
  const parts = [source, session_id, source_event, tool_use_id];
  if (turn_id) parts.push(turn_id);
  return JSON.stringify(parts);
}

function occurrenceDedupKey({ source, session_id, source_event, observed_at, actor }, occurrenceIndex) {
  return JSON.stringify(['no-id', source, session_id, source_event, observed_at || '', actor || '', occurrenceIndex]);
}

module.exports = {
  SCHEMA_VERSION,
  PROVENANCE,
  CONTENT_CLASS,
  CLAIM_TYPE,
  EVENT_KIND,
  EVENT_STATUS,
  IDENTITY_CONFIDENCE,
  DEPTH,
  QUESTION_ORIGIN,
  NODE_KIND,
  EDGE_RELATION,
  MARK_STATE,
  COVERAGE,
  validateEvent,
  validateRecord,
  validateQuestion,
  validateExplanation,
  computeDedupKey,
  occurrenceDedupKey,
};
