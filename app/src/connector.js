'use strict';
// Tramora connector: serves the light UI against a read-only JSONL written by the
// lifecycle hooks of any authorized project. Local only (127.0.0.1), no remote
// sending, generation stays rule-based and local.
//
// Usage:
//   TRAMORA_HOOKS_LOG=<jsonl> TRAMORA_DB=<db> TRAMORA_PROJECT=<label> \
//     node src/connector.js
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const APP = path.resolve(__dirname, '..');
const { createApp } = require('./app');
const { normalize } = require('./capture/hooks-adapter');

const PORT = Number(process.env.TRAMORA_PORT || 4212);
const HOOKS_LOG = process.env.TRAMORA_HOOKS_LOG;
const DB = process.env.TRAMORA_DB;
const PROJECT = process.env.TRAMORA_PROJECT || 'authorized-project';
const TASK_TITLE = process.env.TRAMORA_TASK_TITLE || `Observed session (${PROJECT})`;
const STATIC_DIR = path.join(APP, 'static');

// The static UI ships labelled as a fictitious fixture demo, which is correct for
// `npm start` (declared fixture data) but wrong here: this connector serves real
// events captured from an authorized session. Labelling observed activity as
// fictitious is the same class of error as the reverse, so the served page is
// relabelled. Product files stay untouched.
const PAGE_LABELS = {
  badge: 'observed session',
  hint: 'Events captured from an authorized session. Only observed events are shown; '
    + 'a gap is shown as a gap and is never inferred.',
};

if (!HOOKS_LOG) {
  console.error('TRAMORA_HOOKS_LOG is required (sanitized JSONL written by the project hook)');
  process.exit(2);
}
if (!fs.existsSync(HOOKS_LOG)) {
  console.error(`TRAMORA_HOOKS_LOG not found: ${HOOKS_LOG}`);
  process.exit(2);
}
if (!DB) {
  console.error('TRAMORA_DB is required (local store file for this project)');
  process.exit(2);
}

const REDACT = ['secret', 'token', 'password', 'credential', 'api_key', 'authorization'];
const redactor = (obj) => {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        if (REDACT.some((r) => k.toLowerCase().includes(r))) out[k] = '[redacted]';
        else out[k] = walk(val);
      }
      return out;
    }
    return v;
  };
  return walk(obj);
};

const app = createApp({ file: DB, permission: true, captureEnabled: true, generatedBy: 'local-rules' });

let sessionId = null;
let captureFailures = 0;
let corruptLines = 0;
let readError = null;
function refresh() {
  let text;
  try {
    text = fs.readFileSync(HOOKS_LOG, 'utf8');
    readError = null;
  } catch (err) {
    readError = String((err && err.message) || err).slice(0, 200);
    return;
  }
  const parts = text.split('\n');
  // The hook writes one complete line per event, newline included. The final
  // element is either empty (the file ends with '\n') or a line still being
  // written, so it is excluded by position, not by content: two identical
  // corrupt lines must not both be dismissed as in-flight.
  const lastIndex = parts.length - 1;
  const partialIndex = text.endsWith('\n') ? -1 : lastIndex;
  const events = [];
  captureFailures = 0;
  corruptLines = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const l = parts[i];
    if (!l.trim()) continue;
    let e;
    try {
      e = JSON.parse(l);
    } catch {
      if (i === partialIndex) continue;
      corruptLines += 1;
      continue;
    }
    if (!e || !e.hook_event) { corruptLines += 1; continue; }
    // A capture failure is not an observed event: it is counted and shown as a
    // declared gap, never ingested as activity of the session.
    if (e.capture_error || e.input_received === false) { captureFailures += 1; continue; }
    events.push(e);
  }
  if (!events.length) return;
  const sid = events.find((e) => e.session_id)?.session_id || sessionId;
  if (!sid) return;
  sessionId = sid;
  const taskId = `task::${sid}`;
  try {
    app.createTask({ id: taskId, project_ref: PROJECT, title: TASK_TITLE, status: 'open' });
  } catch { /* already created */ }
  try {
    app.createSession({ id: sid, task_ref: taskId, source: 'hooks', started_at: events[0]?.ts || new Date().toISOString() });
  } catch { /* already created */ }
  // Only this session's events; other sessions in the same log stay separate.
  for (const ev of events) {
    if (ev.session_id && ev.session_id !== sid) continue;
    const id = ev.hook_event === 'PreToolUse' || ev.hook_event === 'PostToolUse'
      ? `ev::${ev.session_id}::${ev.hook_event}::${ev.tool_use_id}`
      : `ev::${ev.session_id}::${ev.hook_event}::${ev.ts}`;
    const raw = {
      id,
      session_id: sid,
      source_event: ev.hook_event,
      observed_at: ev.ts,
      tool_use_id: ev.tool_use_id,
      turn_id: ev.turn_id,
      payload: redactor({
        tool: ev.tool_name,
        tool_input: ev.command,
        tool_response: ev.response,
        cwd: ev.cwd,
      }),
    };
    app.ingest(normalize(raw));
  }
}
refresh();

const MAX_BODY_BYTES = 64 * 1024;
const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1']);
function readJson(req, cb) {
  const chunks = []; let size = 0;
  req.on('data', (c) => { size += c.length; if (size <= MAX_BODY_BYTES + 1) chunks.push(c); });
  req.on('end', () => {
    if (size > MAX_BODY_BYTES) return cb(Object.assign(new Error('body too large'), { status: 413 }));
    try {
      const body = Buffer.concat(chunks).toString('utf8');
      cb(null, body ? JSON.parse(body) : {});
    } catch (e) { cb(e); }
  });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const jsend = (s, b) => {
    const t = JSON.stringify(b);
    res.writeHead(s, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(t);
  };
  const originOk = () => {
    const o = req.headers.origin, h = req.headers.host;
    if (!o && !h) return req.method === 'GET' || req.method === 'HEAD';
    try {
      const u = new URL(o);
      return LOCAL_HOSTNAMES.has(u.hostname) && u.protocol === 'http:' && u.origin === `http://${h}`;
    } catch { return false; }
  };
  const MUTATING = new Set(['/api/capture', '/api/ask', '/api/node', '/api/mark']);
  if (MUTATING.has(p) && req.method !== 'POST') return jsend(405, { error: 'method not allowed; use POST' });
  if (req.method !== 'GET' && req.method !== 'HEAD' && !originOk()) return jsend(403, { error: 'origin rejected' });

  refresh();

  if (p === '/api/state') return jsend(200, { sessionId, coverage: app.coverage(), captureEnabled: app.state.captureEnabled, permission: app.state.permission, httpsCapable: false, captureFailures, corruptLines, readError });
  if (p === '/api/events') return jsend(200, { events: app.listEvents(sessionId) });
  if (p === '/api/nodes') return jsend(200, { nodes: app.listNodes() });
  if (p === '/api/return-overview') return jsend(200, app.getReturnOverview(sessionId));
  if (p === '/api/node-version') { const v = url.searchParams.get('id'); return jsend(200, v ? app.getNodeVersion(v) || { error: 'version not found' } : { error: 'missing id' }); }
  if (p === '/api/map-marked') return jsend(200, { marked: app.listMarked() });
  if (p === '/api/export') {
    const d = app.exportData();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="tramora-export.json"', 'X-Content-Type-Options': 'nosniff' });
    return res.end(d);
  }
  if (p === '/api/ask') return readJson(req, (err, input) => { if (err) return jsend(err.status || 400, { error: err.message }); const r = app.ask(input); return jsend(r.error || r.blocked ? 400 : 200, r); });
  if (p === '/api/node') return readJson(req, (err, input) => { if (err) return jsend(err.status || 400, { error: err.message }); try { return jsend(200, app.saveNode(input)); } catch (e) { return jsend(400, { error: e.message }); } });
  if (p === '/api/mark') return readJson(req, (err, input) => { if (err) return jsend(err.status || 400, { error: err.message }); try { return jsend(200, { mark: app.mark({ nodeId: input.nodeId, on: input.on, contextRef: input.contextRef, markedBy: input.markedBy }) }); } catch (e) { return jsend(400, { error: e.message }); } });
  if (p === '/api/capture') return readJson(req, (err, input) => { if (err) return jsend(err.status || 400, { error: err.message }); app.setCaptureEnabled(!!input.enabled); return jsend(200, { captureEnabled: app.state.captureEnabled, coverage: app.coverage() }); });

  const rel = p === '/' ? 'index.html' : p.slice(1);
  const fp = path.join(STATIC_DIR, rel);
  if (!fp.startsWith(STATIC_DIR)) return jsend(403, { error: 'forbidden' });
  fs.readFile(fp, (err, data) => {
    if (err) return jsend(404, { error: 'not found' });
    let body = data;
    if (path.extname(fp).toLowerCase() === '.html') {
      body = data.toString('utf8')
        .replace('<span class="badge">fixture demo</span>', `<span class="badge">${PAGE_LABELS.badge}</span>`)
        .replace('This is a fictitious fixture demo. Only observed events are shown.', PAGE_LABELS.hint);
    }
    res.setHeader('Content-Type', MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Tramora connector on http://127.0.0.1:${PORT}  project=${PROJECT}  db=${DB}`);
});
