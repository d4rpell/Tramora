'use strict';

const { app, sessionId } = require('./server-context');

const httpsCapable = false;
const MAX_BODY_BYTES = 64 * 1024;
const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1']);

function readJson(req, cb) {
  // Size limit: refuse oversized bodies instead of buffering them (P2).
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size <= MAX_BODY_BYTES + 1) chunks.push(chunk);
  });
  req.on('end', () => {
    if (size > MAX_BODY_BYTES) {
      return cb(Object.assign(new Error('body too large'), { status: 413 }));
    }
    const body = Buffer.concat(chunks).toString('utf8');
    try {
      cb(null, body ? JSON.parse(body) : {});
    } catch (err) {
      cb(err);
    }
  });
  req.on('error', (err) => cb(err));
}

function apiRoutes(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const send = (status, body) => {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(payload);
  };

  // Cross-site protection for state-changing requests (P1): a browser sends
  // `Origin` on every non-GET request; reject a mutation without a matching
  // local origin (scheme, host and port must all match the request Host).
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.origin;
    const host = req.headers.host;
    let originOk = false;
    if (origin && host) {
      try {
        const parsed = new URL(origin);
        originOk =
          LOCAL_HOSTNAMES.has(parsed.hostname) &&
          parsed.protocol === 'http:' &&
          parsed.origin === `http://${host}`;
      } catch {
        originOk = false;
      }
    }
    if (!originOk) return send(403, { error: 'origin rejected' });
  }

  if (req.method === 'GET' && path === '/api/state') {
    return send(200, {
      sessionId,
      coverage: app.coverage(),
      captureEnabled: app.state.captureEnabled,
      permission: app.state.permission,
      httpsCapable,
    });
  }

  if (req.method === 'GET' && path === '/api/events') {
    return send(200, { events: app.listEvents(sessionId) });
  }

  if (req.method === 'GET' && path === '/api/nodes') {
    return send(200, { nodes: app.listNodes() });
  }

  if (req.method === 'GET' && path === '/api/return-overview') {
    return send(200, app.getReturnOverview(sessionId));
  }

  if (req.method === 'GET' && path === '/api/node-version') {
    const versionId = url.searchParams.get('id');
    const version = versionId ? app.getNodeVersion(versionId) : null;
    return send(200, version || { error: 'version not found' });
  }

  if (req.method === 'POST' && path === '/api/node') {
    return readJson(req, (err, input) => {
      if (err) return send(err.status || 400, { error: err.message });
      try {
        const result = app.saveNode(input);
        send(200, result);
      } catch (error) {
        send(400, { error: error.message });
      }
    });
  }

  if (req.method === 'GET' && path === '/api/map-marked') {
    return send(200, { marked: app.listMarked() });
  }

  if (req.method === 'POST' && path === '/api/mark') {
    return readJson(req, (err, input) => {
      if (err) return send(err.status || 400, { error: err.message });
      try {
        const mark = app.mark({ nodeId: input.nodeId, on: input.on, contextRef: input.contextRef, markedBy: input.markedBy });
        send(200, { mark });
      } catch (error) {
        send(400, { error: error.message });
      }
    });
  }

  if (req.method === 'POST' && path === '/api/ask') {
    return readJson(req, (err, input) => {
      if (err) return send(err.status || 400, { error: err.message });
      const result = app.ask(input);
      send(result.error || result.blocked ? 400 : 200, result);
    });
  }

  if (req.method === 'POST' && path === '/api/capture') {
    return readJson(req, (err, input) => {
      if (err) return send(err.status || 400, { error: err.message });
      app.setCaptureEnabled(!!input.enabled);
      send(200, { captureEnabled: app.state.captureEnabled, coverage: app.coverage() });
    });
  }

  if (req.method === 'GET' && path === '/api/export') {
    const data = app.exportData();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="tramora-export.json"',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.end(data);
  }

  send(404, { error: 'not found' });
}

module.exports = { apiRoutes };