'use strict';

const { DatabaseSync } = require('node:sqlite');

function initDatabase(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_ref TEXT NOT NULL,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'open'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      task_ref TEXT NOT NULL REFERENCES tasks(id),
      source TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      task_ref TEXT NOT NULL REFERENCES tasks(id),
      kind TEXT NOT NULL,
      source_event TEXT NOT NULL,
      actor TEXT,
      actor_ref TEXT,
      recipient TEXT,
      tool_use_id TEXT,
      turn_id TEXT,
      human_decision_ref TEXT,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      dedup_key TEXT,
      identity_confidence TEXT NOT NULL,
      observed_at TEXT,
      received_at TEXT NOT NULL,
      provenance TEXT NOT NULL,
      content_class TEXT NOT NULL,
      source TEXT,
      source_ref TEXT,
      coverage TEXT NOT NULL,
      occurrence_index INTEGER,
      UNIQUE (dedup_key, session_id)
    );

    CREATE TABLE IF NOT EXISTS explanations (
      id TEXT PRIMARY KEY,
      question_ref TEXT NOT NULL REFERENCES questions(id),
      task_ref TEXT NOT NULL,
      session_ref TEXT NOT NULL,
      event_ref TEXT NOT NULL REFERENCES events(id),
      text TEXT NOT NULL,
      depth TEXT NOT NULL,
      shown_at TEXT NOT NULL,
      context_ref TEXT NOT NULL,
      project_revision TEXT,
      generated_by TEXT NOT NULL,
      content_class TEXT NOT NULL,
      FOREIGN KEY (task_ref) REFERENCES tasks(id),
      FOREIGN KEY (session_ref) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      explanation_ref TEXT NOT NULL REFERENCES explanations(id),
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      source_refs_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      question_ref TEXT,
      explanation_ref TEXT,
      project_revision TEXT,
      schema_version TEXT NOT NULL,
      content_version INTEGER NOT NULL DEFAULT 1,
      previous_version_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS node_versions (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL REFERENCES nodes(id),
      content_version INTEGER NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      question_ref TEXT,
      explanation_ref TEXT,
      project_revision TEXT,
      schema_version TEXT NOT NULL,
      sources_json TEXT NOT NULL DEFAULT '[]',
      links_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT,
      updated_at TEXT,
      UNIQUE (node_id, content_version)
    );

    CREATE TABLE IF NOT EXISTS node_sources (
      node_id TEXT NOT NULL REFERENCES nodes(id),
      event_id TEXT NOT NULL REFERENCES events(id),
      PRIMARY KEY (node_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      from_node TEXT NOT NULL REFERENCES nodes(id),
      to_node TEXT NOT NULL REFERENCES nodes(id),
      relation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_marks (
      id TEXT PRIMARY KEY,
      node_ref TEXT NOT NULL REFERENCES nodes(id),
      context_ref TEXT,
      state TEXT NOT NULL,
      marked_at TEXT NOT NULL,
      marked_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      origin TEXT NOT NULL,
      task_ref TEXT NOT NULL REFERENCES tasks(id),
      session_ref TEXT NOT NULL REFERENCES sessions(id),
      event_ref TEXT NOT NULL REFERENCES events(id),
      depth TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  db.prepare('INSERT OR IGNORE INTO metadata (key, value) VALUES (?, ?)').run('schema_version', '1');

  // Migration: add sources_json/links_json to node_versions on pre-existing
  // databases (created before schema v1 included them). IF NOT EXISTS does not
  // alter existing tables, so we check pragma table_info and ALTER if missing.
  const nodeVersionCols = db.prepare("PRAGMA table_info(node_versions)").all().map((c) => c.name);
  if (!nodeVersionCols.includes('sources_json')) {
    db.exec("ALTER TABLE node_versions ADD COLUMN sources_json TEXT NOT NULL DEFAULT '[]'");
  }
  if (!nodeVersionCols.includes('links_json')) {
    db.exec("ALTER TABLE node_versions ADD COLUMN links_json TEXT NOT NULL DEFAULT '[]'");
  }

  return db;
}

module.exports = { initDatabase };