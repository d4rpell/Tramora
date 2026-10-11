'use strict';

// Fictitious fixture session for the light walkthrough (T1-01). No real data.
// Every value is invented and declared as such in the UI and docs.

const SESSION_ID = 'fixture-session-t1';
const TASK_ID = 'fixture-task-t1';
const PROJECT_REF = 'fixture-project';

function wireHooks(app) {
  app.createTask({
    id: TASK_ID,
    project_ref: PROJECT_REF,
    title: 'Fixture task (fictitious)',
    status: 'open',
  });
  app.createSession({
    id: SESSION_ID,
    task_ref: TASK_ID,
    source: 'hooks',
    started_at: '2026-10-11T08:00:00.000Z',
  });

  app.ingest({
    id: 'ev:1',
    session_id: SESSION_ID,
    kind: 'session',
    source_event: 'SessionStart',
    actor: 'user',
    observed_at: '2026-10-11T08:00:00.000Z',
    tool_use_id: null,
    content_class: 'acknowledgment',
    payload: { note: 'fixture session begins (fictitious)' },
    status: 'captured',
  });
  app.ingest({
    id: 'ev:2',
    session_id: SESSION_ID,
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T08:01:00.000Z',
    tool_use_id: 'tu:alpha',
    turn_id: 'turn:1',
    payload: {
      tool: 'apply_patch',
      input: 'add readme section',
      secret: 'TRAMORA_TEST_SECRET_1',
    },
    status: 'captured',
  });
  app.ingest({
    id: 'ev:3',
    session_id: SESSION_ID,
    kind: 'result',
    source_event: 'PostToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T08:01:30.000Z',
    tool_use_id: 'tu:alpha',
    turn_id: 'turn:1',
    payload: {
      status: 'ok',
      tool_response: 'patch applied',
      check_ref: 'fixture-diff:rev-1',
    },
    status: 'captured',
  });
  app.ingest({
    id: 'ev:4',
    session_id: SESSION_ID,
    kind: 'action',
    source_event: 'PreToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T08:02:00.000Z',
    tool_use_id: 'tu:beta',
    turn_id: 'turn:2',
    payload: {
      tool: 'Bash',
      input: 'run tests',
      secret: 'TRAMORA_TEST_SECRET_2',
    },
    status: 'captured',
  });
  app.ingest({
    id: 'ev:5',
    session_id: SESSION_ID,
    kind: 'result',
    source_event: 'PostToolUse',
    actor: 'coder',
    observed_at: '2026-10-11T08:02:40.000Z',
    tool_use_id: 'tu:beta',
    turn_id: 'turn:2',
    payload: {
      status: 'ok',
      tool_response: 'tests passed',
      check_ref: 'fixture-tests:green',
    },
    status: 'captured',
  });
  app.ingest({
    id: 'ev:6',
    session_id: SESSION_ID,
    kind: 'session',
    source_event: 'Stop',
    actor: 'user',
    observed_at: '2026-10-11T08:05:00.000Z',
    tool_use_id: null,
    content_class: 'acknowledgment',
    payload: { note: 'fixture session ends (fictitious)' },
    status: 'captured',
  });
  return { sessionId: SESSION_ID, taskId: TASK_ID };
}

module.exports = { wireHooks, SESSION_ID, TASK_ID, PROJECT_REF };