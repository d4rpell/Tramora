'use strict';

const {
  PROVENANCE,
  CONTENT_CLASS,
  NODE_KIND,
  EDGE_RELATION,
  MARK_STATE,
  QUESTION_ORIGIN,
  SCHEMA_VERSION,
  validateEvent,
  validateQuestion,
  validateExplanation,
  validateRecord,
  computeDedupKey,
  occurrenceDedupKey,
} = require('./contracts');

function rowToRecord(row, claims) {
  return {
    id: row.id,
    text: row.text,
    depth: row.depth,
    shown_at: row.shown_at,
    context_ref: row.context_ref,
    project_revision: row.project_revision,
    generated_by: row.generated_by,
    provenance: PROVENANCE.GENERATED,
    content_class: row.content_class,
    question_ref: row.question_ref,
    task_ref: row.task_ref,
    session_ref: row.session_ref,
    event_ref: row.event_ref,
    claims: JSON.parse(claims || '[]'),
  };
}

function eventFromRow(row) {
  const payload = JSON.parse(row.payload);
  return {
    id: row.id,
    session_id: row.session_id,
    task_ref: row.task_ref,
    kind: row.kind,
    source_event: row.source_event,
    actor: row.actor,
    actor_ref: row.actor_ref,
    recipient: row.recipient,
    tool_use_id: row.tool_use_id,
    turn_id: row.turn_id,
    human_decision_ref: row.human_decision_ref,
    payload,
    status: row.status,
    dedup_key: row.dedup_key,
    identity_confidence: row.identity_confidence,
    observed_at: row.observed_at,
    received_at: row.received_at,
    occurrence_index: row.occurrence_index,
    provenance: row.provenance,
    content_class: row.content_class,
    source: row.source,
    source_ref: row.source_ref,
    coverage: row.coverage,
  };
}

function getSessionTask(db, sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);
  return session;
}

function createSession(db, session) {
  db.prepare('INSERT OR REPLACE INTO sessions (id, task_ref, source, started_at, ended_at) VALUES (?, ?, ?, ?, ?)')
    .run(session.id, session.task_ref, session.source, session.started_at ?? null, session.ended_at ?? null);
  getSessionTask(db, session.id);
  return session;
}

function createTask(db, task) {
  db.prepare('INSERT OR REPLACE INTO tasks (id, project_ref, title, status) VALUES (?, ?, ?, ?)')
    .run(task.id, task.project_ref, task.title ?? null, task.status ?? 'open');
  return task;
}

function inferContentClass(event) {
  if (event.kind === 'result') return CONTENT_CLASS.OBSERVED_RESULT;
  if (event.kind === 'action') return CONTENT_CLASS.PROPOSAL;
  return CONTENT_CLASS.PROPOSAL;
}

function nextOccurrenceIndex(db, record) {
  return db.prepare(`
    SELECT COALESCE(MAX(occurrence_index), 0) + 1 AS n
    FROM events
    WHERE session_id = ? AND source_event = ? AND (actor IS ? OR actor = ?)
  `).get(record.session_id, record.source_event, null, record.actor ?? null)?.n ?? 1;
}

function ingestEvent(db, rawEvent, redactor) {
  const event = redactor ? redactor(rawEvent) : rawEvent;
  const session = getSessionTask(db, event.session_id);
  event.task_ref = session.task_ref;
  event.received_at = event.received_at || new Date().toISOString();
  const record = {
    ...event,
    provenance: PROVENANCE.OBSERVED,
    content_class: event.content_class || inferContentClass(event),
    source: session.source,
    source_ref: event.source_ref || `${session.source}:${event.observed_at || ''}`,
    coverage: event.coverage || 'captured',
    status: event.status || 'captured',
  };
  if (record.content_class === CONTENT_CLASS.HUMAN_DECISION) {
    // Validate, never infer: a human decision requires an observed person
    // as actor and a reference to the explicit human input record.
    if (record.actor_ref !== 'person') {
      throw new Error('human_decision requires actor_ref=person (observed)');
    }
    record.human_decision_ref = record.human_decision_ref || (record.payload && record.payload.human_decision_ref);
    if (!record.human_decision_ref) {
      throw new Error('human_decision requires human_decision_ref');
    }
  }
  if (record.content_class === CONTENT_CLASS.OBSERVED_RESULT && !record.check_ref && !record.payload.artifact_ref && !record.payload.check_ref) {
    record.check_ref = record.source_ref;
  }
  let dedupKey = computeDedupKey(record);
  if (!dedupKey) {
    record.identity_confidence = 'uncertain';
    const occurrenceIndex = nextOccurrenceIndex(db, record);
    record.occurrence_index = occurrenceIndex;
    dedupKey = occurrenceDedupKey(record, occurrenceIndex);
  } else {
    record.identity_confidence = record.identity_confidence || 'deterministic';
  }
  record.dedup_key = dedupKey;
  validateEvent(record);
  const byId = db.prepare('SELECT id FROM events WHERE id = ?').get(record.id);
  if (byId) {
    // same stable id re-delivered: idempotent against fixture reload and source re-delivery
    return { event: eventFromRow(db.prepare('SELECT * FROM events WHERE id = ?').get(record.id)), duplicate: true, existing_id: byId.id };
  }
  const existing = db.prepare('SELECT id FROM events WHERE dedup_key = ? AND session_id = ?').get(record.dedup_key, record.session_id);
  if (existing) return { event: null, duplicate: true, existing_id: existing.id };
  const result = db.prepare(`
    INSERT INTO events
      (id, session_id, task_ref, kind, source_event, actor, actor_ref, recipient, tool_use_id, turn_id,
       human_decision_ref, payload, status, dedup_key, identity_confidence, observed_at, received_at,
       provenance, content_class, source, source_ref, coverage, occurrence_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id, record.session_id, record.task_ref, record.kind, record.source_event,
    record.actor ?? null, record.actor_ref ?? null, record.recipient ?? null, record.tool_use_id ?? null, record.turn_id ?? null,
    record.human_decision_ref ?? null, JSON.stringify(record.payload ?? {}), record.status, record.dedup_key,
    record.identity_confidence, record.observed_at ?? null, record.received_at, record.provenance,
    record.content_class, record.source, record.source_ref, record.coverage, record.occurrence_index ?? null,
  );
  return { event: eventFromRow(db.prepare('SELECT * FROM events WHERE id = ?').get(record.id)), duplicate: false };
}

function countEvents(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM events').get().n;
}

function listEvents(db, sessionRef) {
  return (sessionRef
    ? db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY received_at ASC, rowid ASC').all(sessionRef)
    : db.prepare('SELECT * FROM events ORDER BY received_at ASC, rowid ASC').all()
  ).map(eventFromRow);
}

function getEvent(db, eventId) {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  return row ? eventFromRow(row) : null;
}

function registerQuestion(db, question) {
  validateQuestion(question);
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(question.id);
  if (existing) return question;
  const session = getSessionTask(db, question.session_ref);
  if (session.task_ref !== question.task_ref) {
    throw new Error(`question session/task mismatch: session ${question.session_ref} belongs to task ${session.task_ref}, question says ${question.task_ref}`);
  }
  const event = getEvent(db, question.event_ref);
  if (!event) throw new Error(`event not found: ${question.event_ref}`);
  if (event.session_id !== question.session_ref) {
    throw new Error('question.event_ref does not belong to session_ref');
  }
  db.prepare('INSERT INTO questions (id, text, origin, task_ref, session_ref, event_ref, depth) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(question.id, question.text, question.origin, question.task_ref, question.session_ref, question.event_ref, question.depth);
  return question;
}

function listQuestions(db) {
  return db.prepare('SELECT * FROM questions ORDER BY rowid ASC').all().map((row) => ({
    id: row.id,
    text: row.text,
    origin: row.origin,
    task_ref: row.task_ref,
    session_ref: row.session_ref,
    event_ref: row.event_ref,
    depth: row.depth,
  }));
}

function saveExplanation(db, explanation) {
  validateExplanation(explanation);
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(explanation.question_ref);
  if (!question) throw new Error(`question ${explanation.question_ref} not found from explanation`);
  const record = {
    ...explanation,
    provenance: PROVENANCE.GENERATED,
    content_class: CONTENT_CLASS.OUTCOME,
    task_ref: question.task_ref,
    session_ref: question.session_ref,
    event_ref: question.event_ref,
  };
  validateRecord(record);
  const claimsJson = JSON.stringify(explanation.claims ?? []);
  const existing = db.prepare('SELECT * FROM explanations WHERE id = ?').get(explanation.id);
  if (existing) {
    db.prepare(`
      UPDATE explanations SET text = ?, depth = ?, shown_at = ?, context_ref = ?, project_revision = ?, generated_by = ?, content_class = ?
      WHERE id = ?
    `).run(record.text, record.depth, record.shown_at, record.context_ref, record.project_revision, record.generated_by, record.content_class, explanation.id);
    db.prepare('DELETE FROM claims WHERE explanation_ref = ?').run(explanation.id);
  } else {
    db.prepare(`
      INSERT INTO explanations (id, question_ref, task_ref, session_ref, event_ref, text, depth, shown_at, context_ref, project_revision, generated_by, content_class)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(record.id, record.question_ref, record.task_ref, record.session_ref, record.event_ref,
      record.text, record.depth, record.shown_at, record.context_ref, record.project_revision, record.generated_by, record.content_class);
  }
  for (const [i, claim] of (explanation.claims ?? []).entries()) {
    db.prepare('INSERT INTO claims (id, explanation_ref, type, text, source_refs_json) VALUES (?, ?, ?, ?, ?)')
      .run(`${explanation.id}::claim::${i}`, explanation.id, claim.type, claim.text, JSON.stringify(claim.source_refs ?? []));
  }
  return { ...record, claims: JSON.parse(claimsJson) };
}

function getExplanation(db, explanationId) {
  const row = db.prepare('SELECT * FROM explanations WHERE id = ?').get(explanationId);
  if (!row) return null;
  const claims = db.prepare('SELECT * FROM claims WHERE explanation_ref = ? ORDER BY rowid ASC').all(explanationId);
  return {
    id: row.id,
    question_ref: row.question_ref,
    task_ref: row.task_ref,
    session_ref: row.session_ref,
    event_ref: row.event_ref,
    text: row.text,
    depth: row.depth,
    shown_at: row.shown_at,
    context_ref: row.context_ref,
    project_revision: row.project_revision,
    generated_by: row.generated_by,
    provenance: PROVENANCE.GENERATED,
    content_class: row.content_class,
    claims: claims.map((c) => ({ type: c.type, text: c.text, source_refs: JSON.parse(c.source_refs_json) })),
  };
}

function listExplanations(db) {
  return db.prepare('SELECT * FROM explanations ORDER BY rowid ASC').all().map((row) => getExplanation(db, row.id));
}

const EDGE_RELATION_DECIDED = 'decided';

function assertDecisionHasHumanSource(db, sources) {
  const humanDecision = (sources || []).some((eventId) => {
    const ev = getEvent(db, eventId);
    return ev && ev.content_class === CONTENT_CLASS.HUMAN_DECISION
      && ev.actor_ref === 'person'
      && !!ev.human_decision_ref;
  });
  if (!humanDecision) {
    throw new Error('node kind=decision requires a source event that is an observed human_decision (actor_ref=person + human_decision_ref)');
  }
}

function saveNode(db, node) {
  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    const existing = db.prepare('SELECT * FROM nodes WHERE id = ?').get(node.id);
    const prevState = existing ? getNode(db, existing.id) : null;
    let reviewProposed = false;
    // Validate and persist on the *effective final state*: an update that omits
    // kind/sources/links must not silently strip the existing node's state.
    const finalKind = node.kind ?? (existing ? existing.kind : NODE_KIND.CONCEPT);
    const finalSources = node.sources !== undefined
      ? node.sources
      : (prevState ? prevState.sources : []);
    const finalLinks = node.links !== undefined
      ? node.links
      : (prevState ? prevState.links : []);
    if (finalKind === NODE_KIND.DECISION) {
      assertDecisionHasHumanSource(db, finalSources);
    }
    // Validate `decided` edges against exactly the endpoints that will be
    // persisted: this node as `from` and `edge.to` as `to`. A self-edge is
    // valid only if this node itself is a decision.
    for (const edge of finalLinks) {
      if (edge.relation === EDGE_RELATION_DECIDED) {
        const fromIsDecision = finalKind === NODE_KIND.DECISION;
        const toIsDecision = edge.to === node.id
          ? fromIsDecision
          : (getNode(db, edge.to)?.kind === NODE_KIND.DECISION);
        if (!(fromIsDecision || toIsDecision)) {
          throw new Error('edge relation=decided requires one end to be an observed human_decision node');
        }
      }
    }
    // Outgoing edges of this node are replaced at the end, but *incoming*
    // decided edges owned by other nodes survive an edit of this one. Validate
    // them against the final state too: changing this node must not leave an
    // incoming `decided` edge without a decision endpoint.
    const incomingDecided = db.prepare(`
      SELECT from_node, to_node FROM edges
      WHERE to_node = ? AND relation = ?
    `).all(node.id, EDGE_RELATION_DECIDED);
    for (const inc of incomingDecided) {
      const fromNode = getNode(db, inc.from_node);
      const fromIsDecision = fromNode && fromNode.kind === NODE_KIND.DECISION;
      if (!(finalKind === NODE_KIND.DECISION || fromIsDecision)) {
        throw new Error('edge relation=decided requires one end to be an observed human_decision node');
      }
    }
    const contentChanged = !prevState ? true : (
      prevState.kind !== finalKind ||
      prevState.title !== (node.title ?? prevState.title) ||
      prevState.body !== (node.body ?? prevState.body) ||
      (prevState.project_revision ?? null) !== (node.project_revision ?? prevState.project_revision) ||
      (node.question_ref !== undefined && node.question_ref !== prevState.question_ref) ||
      (node.explanation_ref !== undefined && node.explanation_ref !== prevState.explanation_ref) ||
      JSON.stringify(prevState.sources) !== JSON.stringify(finalSources) ||
      JSON.stringify(prevState.links) !== JSON.stringify(finalLinks)
    );
    if (existing) {
      // Keep the previous version *with its sources and links* (spec §3.6:
      // no silent rewrite; the previous version is fully preserved).
      if (contentChanged && prevState) {
        db.prepare(`
          INSERT OR REPLACE INTO node_versions (
            id, node_id, content_version, kind, title, body, question_ref, explanation_ref,
            project_revision, schema_version, sources_json, links_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(`version::${existing.id}::${existing.content_version}`, existing.id, existing.content_version,
          prevState.kind, prevState.title, prevState.body, prevState.question_ref, prevState.explanation_ref,
          prevState.project_revision, prevState.schema_version,
          JSON.stringify(prevState.sources ?? []), JSON.stringify(prevState.links ?? []),
          prevState.created_at, prevState.updated_at);
        if ((prevState.project_revision ?? null) !== (node.project_revision ?? prevState.project_revision)) {
          reviewProposed = true;
        }
      }
      db.prepare(`
        UPDATE nodes SET kind = ?, title = ?, body = ?, question_ref = ?, explanation_ref = ?, project_revision = ?,
          content_version = content_version + ?, previous_version_id = ?, updated_at = ?
        WHERE id = ?
      `).run(finalKind, node.title ?? existing.title, node.body ?? existing.body,
        node.question_ref !== undefined ? node.question_ref : existing.question_ref,
        node.explanation_ref !== undefined ? node.explanation_ref : existing.explanation_ref,
        node.project_revision ?? existing.project_revision,
        contentChanged ? 1 : 0,
        contentChanged ? `version::${existing.id}::${existing.content_version}` : existing.previous_version_id,
        now, node.id);
    } else {
      db.prepare(`
        INSERT INTO nodes (id, kind, title, body, question_ref, explanation_ref, project_revision, schema_version, content_version, previous_version_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(node.id, finalKind, node.title, node.body ?? null, node.question_ref ?? null,
        node.explanation_ref ?? null, node.project_revision ?? null, SCHEMA_VERSION, 1, null, now, now);
    }
    db.prepare('DELETE FROM node_sources WHERE node_id = ?').run(node.id);
    for (const eventId of finalSources ?? []) {
      db.prepare('INSERT OR IGNORE INTO node_sources (node_id, event_id) VALUES (?, ?)').run(node.id, eventId);
    }
    // Remove only this node's outgoing edges; incoming edges owned by other
    // nodes are never deleted by editing this one.
    db.prepare('DELETE FROM edges WHERE from_node = ?').run(node.id);
    for (const edge of finalLinks) {
      db.prepare('INSERT INTO edges (id, from_node, to_node, relation) VALUES (?, ?, ?, ?)')
        .run(`${node.id}::edge::${edge.to}::${edge.relation}`, node.id, edge.to, edge.relation);
    }
    db.exec('COMMIT');
    return { node: getNode(db, node.id), reviewProposed };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function getNode(db, nodeId) {
  const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
  if (!row) return null;
  const sources = db.prepare('SELECT event_id FROM node_sources WHERE node_id = ?').all(nodeId).map((r) => r.event_id);
  const links = db.prepare('SELECT from_node, to_node, relation FROM edges WHERE from_node = ?').all(nodeId)
    .map((e) => ({ from: e.from_node, to: e.to_node, relation: e.relation, sources: [] }));
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    question_ref: row.question_ref,
    explanation_ref: row.explanation_ref,
    project_revision: row.project_revision,
    schema_version: row.schema_version,
    content_version: row.content_version,
    previous_version_id: row.previous_version_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    sources,
    links,
  };
}

function listNodes(db) {
  return db.prepare('SELECT * FROM nodes ORDER BY rowid ASC').all().map((row) => getNode(db, row.id));
}

function setMark(db, { nodeId, on, contextRef, markedBy }) {
  const node = getNode(db, nodeId);
  if (!node) throw new Error(`node not found: ${nodeId}`);
  const existing = db.prepare('SELECT * FROM review_marks WHERE node_ref = ?').get(nodeId);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare('UPDATE review_marks SET state = ?, marked_at = ?, context_ref = ?, marked_by = ? WHERE id = ?')
      .run(on ? MARK_STATE.MARKED : MARK_STATE.UNMARKED, now, contextRef ?? null, markedBy ?? null, existing.id);
    return { id: existing.id, node_ref: nodeId, context_ref: contextRef ?? null, state: on ? MARK_STATE.MARKED : MARK_STATE.UNMARKED, marked_at: now, marked_by: markedBy ?? null };
  }
  const id = `mark::${nodeId}`;
  db.prepare('INSERT INTO review_marks (id, node_ref, context_ref, state, marked_at, marked_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, nodeId, contextRef ?? null, on ? MARK_STATE.MARKED : MARK_STATE.UNMARKED, now, markedBy ?? null);
  return { id, node_ref: nodeId, context_ref: contextRef ?? null, state: on ? MARK_STATE.MARKED : MARK_STATE.UNMARKED, marked_at: now, marked_by: markedBy ?? null };
}

function listMarked(db) {
  return db.prepare(`
    SELECT r.* FROM review_marks r
    JOIN nodes n ON n.id = r.node_ref
    WHERE r.state = ?
    ORDER BY r.marked_at ASC
  `).all(MARK_STATE.MARKED).map((row) => ({
    id: row.id,
    node_ref: row.node_ref,
    context_ref: row.context_ref,
    state: row.state,
    marked_at: row.marked_at,
    marked_by: row.marked_by,
  }));
}

function getNodeVersion(db, versionId) {
  const row = db.prepare('SELECT * FROM node_versions WHERE id = ?').get(versionId);
  if (!row) return null;
  return {
    node_id: row.node_id,
    content_version: row.content_version,
    kind: row.kind,
    title: row.title,
    body: row.body,
    question_ref: row.question_ref,
    explanation_ref: row.explanation_ref,
    project_revision: row.project_revision,
    schema_version: row.schema_version,
    sources: JSON.parse(row.sources_json || '[]'),
    links: JSON.parse(row.links_json || '[]'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function removeMark(db, nodeId) {
  db.prepare('UPDATE review_marks SET state = ? WHERE node_ref = ?').run(MARK_STATE.UNMARKED, nodeId);
  return listMarked(db);
}

function exportAll(db) {
  const data = {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    tasks: db.prepare('SELECT * FROM tasks').all(),
    sessions: db.prepare('SELECT * FROM sessions').all(),
    events: db.prepare('SELECT * FROM events').all().map(eventFromRow),
    questions: listQuestions(db),
    explanations: listExplanations(db),
    nodes: listNodes(db),
    node_versions: db.prepare('SELECT * FROM node_versions ORDER BY node_id ASC, content_version ASC').all(),
    review_marks: listMarked(db),
  };
  return JSON.stringify(data, null, 2);
}

function deleteAll(db) {
  for (const table of ['edges', 'node_sources', 'node_versions', 'review_marks', 'nodes', 'claims', 'explanations', 'questions', 'events', 'sessions', 'tasks']) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
}

module.exports = {
  createTask,
  createSession,
  ingestEvent,
  listEvents,
  getEvent,
  countEvents,
  registerQuestion,
  listQuestions,
  saveExplanation,
  getExplanation,
  listExplanations,
  saveNode,
  getNode,
  getNodeVersion,
  listNodes,
  setMark,
  listMarked,
  removeMark,
  exportAll,
  deleteAll,
};