'use strict';

const { randomUUID } = require('node:crypto');

/**
 * Lifecycle-hooks adapter (T1-01b).
 * Normalizes a raw source event (as documented by the selected source, e.g.
 * `PreToolUse`/`PostToolUse`) into an `Event` record. It preserves source,
 * time and available relations, and it never invents a relation the source
 * does not expose (e.g. delegation recipient is kept only when observed).
 */

function deriveId(raw) {
  if (raw.id) return raw.id;
  // Stable occurrence identity: include turn_id when it exists so two turns
  // with the same tool_use_id in one session do not collide.
  if (raw.tool_use_id) {
    const parts = ['hooks', raw.session_id, raw.source_event, raw.tool_use_id];
    if (raw.turn_id) parts.push(raw.turn_id);
    return JSON.stringify(parts);
  }
  // No stable occurrence identifier: unique per capture (randomUUID;
  // `ingestEvent` marks these identity_confidence=uncertain).
  return JSON.stringify(['hooks', raw.session_id, raw.source_event, raw.observed_at || Date.now(), randomUUID()]);
}

function normalize(raw) {
  const event = {
    id: deriveId(raw),
    session_id: raw.session_id,
    kind: raw.kind || inferKind(raw.source_event),
    source_event: raw.source_event,
    actor: raw.actor || inferActor(raw.source_event),
    observed_at: raw.observed_at,
    tool_use_id: raw.tool_use_id ?? null,
    turn_id: raw.turn_id ?? null,
    payload: raw.payload ?? {},
  };
  if (raw.recipient) event.recipient = raw.recipient;
  if (raw.status) event.status = raw.status;
  if (raw.content_class) event.content_class = raw.content_class;
  return event;
}

function inferKind(sourceEvent) {
  if (sourceEvent === 'PostToolUse') return 'result';
  if (sourceEvent === 'SessionStart' || sourceEvent === 'SessionEnd' || sourceEvent === 'Stop') return 'session';
  return 'action';
}

function inferActor(sourceEvent) {
  if (sourceEvent === 'SessionStart' || sourceEvent === 'Stop') return 'user';
  return 'agent';
}

module.exports = { normalize };