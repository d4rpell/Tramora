'use strict';

const { initDatabase } = require('./core/store');
const ops = require('./core/operations');
const { generateExplanation, SUGGESTIONS } = require('./explain/service');
const { makeRedactor } = require('./core/redact');
const { coverageFor } = require('./capture/coverage');

function createApp({ file, secrets = [], permission = false, captureEnabled = true, generatedBy = 'local-rules' }) {
  const db = initDatabase(file);
  const redactor = makeRedactor({ secrets });
  // `permission` = capture permission of the observed source (spec §4: minimal and authorized capture).
  // Remote sending is a separate, stricter gate (`remoteSendPermission`), never enabled in light.
  const state = { permission, captureEnabled, generatedBy, remoteSendPermission: false };

  function setPermission(value) {
    state.permission = !!value;
    return state.permission;
  }

  function setRemoteSendPermission(value) {
    state.remoteSendPermission = !!value;
    return state.remoteSendPermission;
  }

  function setCaptureEnabled(value) {
    state.captureEnabled = !!value;
  }

  function coverage() {
    return coverageFor({
      captureEnabled: state.captureEnabled,
      permission: state.permission,
      hasSignals: ops.countEvents(db) > 0,
    });
  }

  function createTask(task) {
    return ops.createTask(db, task);
  }

  function createSession(session) {
    return ops.createSession(db, session);
  }

  function ingest(rawEvent) {
    if (!state.captureEnabled) return { duplicate: false, event: null, blocked: 'capture stopped' };
    if (!state.permission) {
      // Declared coverage: a session without capture permission is not captured at all.
      return { duplicate: false, event: null, blocked: 'no permission' };
    }
    return ops.ingestEvent(db, rawEvent, redactor);
  }

  function listEvents(sessionRef) {
    return ops.listEvents(db, sessionRef);
  }

  function getEvent(eventId) {
    return ops.getEvent(db, eventId);
  }

  function ask({ eventRef, text, origin = 'user', depth = 'brief' }) {
    const event = ops.getEvent(db, eventRef);
    if (!event) return { error: `event ${eventRef} not found` };
    const taskRef = event.task_ref;
    const sessionRef = event.session_id;
    const question = {
      id: `q::${taskRef}::${sessionRef}::${eventRef}::${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      // redaction applies to all persisted content, including questions (spec §4)
      text: typeof text === 'string' ? redactor(text) : text,
      origin,
      task_ref: taskRef,
      session_ref: sessionRef,
      event_ref: eventRef,
      depth,
    };
    try {
      ops.registerQuestion(db, question);
    } catch (err) {
      return { error: err.message };
    }
    const result = generateExplanation({
      db,
      ops,
      question,
      generatedBy: state.generatedBy,
    });
    if (result.blocked) return { blocked: result.reason, question };
    const explanation = result.explanation;
    ops.saveExplanation(db, explanation);
    return { question, explanation };
  }

  function saveNode(node) {
    // redaction applies to all persisted content, including nodes (spec §4)
    return ops.saveNode(db, redactor(node));
  }

  function getNode(nodeId) {
    return ops.getNode(db, nodeId);
  }

  function getNodeVersion(versionId) {
    return ops.getNodeVersion(db, versionId);
  }

  function listNodes() {
    return ops.listNodes(db);
  }

  function mark({ nodeId, on, contextRef, markedBy }) {
    return ops.setMark(db, { nodeId, on, contextRef, markedBy });
  }

  function listMarked() {
    return ops.listMarked(db);
  }

  function unmark(nodeId) {
    return ops.removeMark(db, nodeId);
  }

  function exportData() {
    return ops.exportAll(db);
  }

  function deleteAll() {
    ops.deleteAll(db);
  }

  function countEvents() {
    return ops.countEvents(db);
  }

  return {
    db,
    state,
    setPermission,
    setCaptureEnabled,
    coverage,
    countEvents,
    createTask,
    createSession,
    ingest,
    listEvents,
    getEvent,
    ask,
    saveNode,
    getNode,
    getNodeVersion,
    listNodes,
    mark,
    listMarked,
    unmark,
    exportData,
    deleteAll,
    suggestions: () => [...SUGGESTIONS],
  };
}

module.exports = { createApp };