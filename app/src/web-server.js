'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { apiRoutes } = require('./server');

const PORT = Number(process.env.TRAMORA_PORT || 4210);
const STATIC_DIR = path.join(__dirname, '..', 'static');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return apiRoutes(req, res);
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const filePath = path.join(STATIC_DIR, rel);
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  serveFile(res, filePath);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Tramora light preview listening on http://127.0.0.1:${PORT}`);
});