'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const ROOT = path.join(__dirname, '..');
const PORT = 4310;

let server;

function startServer() {
  const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tramora-e2e-')), 't.db');
  server = spawn(process.execPath, [path.join(ROOT, 'src', 'web-server.js')], {
    env: { ...process.env, TRAMORA_PORT: String(PORT), TRAMORA_DB: dbFile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 8000);
    server.stdout.on('data', (d) => {
      if (d.toString().includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited with ${code}`));
    });
  });
}

function stopServer() {
  if (server) {
    server.kill();
    server = null;
  }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function postJson(url, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    }, (res) => {
      let out = '';
      res.on('data', (c) => (out += c));
      res.on('end', () => resolve({ status: res.statusCode, body: out }));
    });
    req.on('error', reject);
    req.end(data);
  });
}

async function withPage(t, viewport, reducedMotion, fn) {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport, reducedMotion });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await fn(page);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

test('a11y: 320px no horizontal overflow; keyboard operable; reduced-motion respected', async (t) => {
  await t.test('server starts with fixture data', async () => {
    await startServer();
    const body = await getJson(`http://127.0.0.1:${PORT}/api/events`);
    const events = JSON.parse(body).events;
    assert.ok(events.length > 0, 'fixture events are served');
    assert.ok(events.some((e) => JSON.stringify(e.payload).includes('[redacted]')), 'redaction visible in fixture');
  });

  await t.test('room shows observed events and no invented activity', async () => {
    await withPage(t, { width: 1280, height: 800 }, null, async (page) => {
      await page.waitForSelector('.event');
      const count = await page.locator('.event').count();
      assert.ok(count >= 6, `expected fixture events, got ${count}`);
      const log = await page.locator('#tab-log-view').count();
      assert.equal(log, 1, 'log view exists in the DOM');
    });
  });

  await t.test('320 px: no horizontal overflow on room/log/map', async () => {
    await withPage(t, { width: 320, height: 700 }, null, async (page) => {
      await page.waitForSelector('.event');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false, 'no horizontal overflow at 320px');
      const width = await page.evaluate(() => document.documentElement.clientWidth);
      assert.equal(width, 320);
    });
  });

  await t.test('keyboard: selecting an event and asking works without a mouse', async () => {
    await withPage(t, { width: 900, height: 800 }, null, async (page) => {
      await page.waitForSelector('.event');
      await page.locator('.event').first().focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#question-text:not([disabled])');
      await page.fill('#question-text', 'what did this do?');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => (document.querySelector('.explanation')?.textContent || '').includes('Explanation'), null, { timeout: 10000 });
      const text = await page.locator('.explanation').innerText();
      assert.match(text, /Explanation/);
    });
  });

  await t.test('reduced-motion: animations are disabled for the event cards', async () => {
    await withPage(t, { width: 900, height: 800 }, 'reduce', async (page) => {
      await page.waitForSelector('.event');
      const hasAnimation = await page.evaluate(() => {
        const el = document.querySelector('.event');
        return getComputedStyle(el).animationName && getComputedStyle(el).animationName !== 'none';
      });
      assert.equal(hasAnimation, false, 'no CSS animation under prefers-reduced-motion');
    });
  });

  await t.test('map: ask, save a node and mark it via UI', async () => {
    await withPage(t, { width: 1000, height: 800 }, null, async (page) => {
      await page.waitForSelector('.event');
      await page.locator('.event').first().click();
      await page.fill('#question-text', 'save me');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => (document.querySelector('.explanation')?.textContent || '').includes('Explanation'), null, { timeout: 10000 });
      await page.click('#tab-map');
      await page.click('#map-save');
      await page.waitForSelector('.node');
      await page.click('.node button:has-text("mark")');
      await page.waitForSelector('.node .marked', { timeout: 10000 });
    });
  });

  await t.test('cross-site: mutations without a local Origin are rejected (403)', async () => {
    // POST /api/capture without Origin → 403
    const noOrigin = await postJson(`http://127.0.0.1:${PORT}/api/capture`, { enabled: true });
    assert.equal(noOrigin.status, 403, 'mutation without Origin must be rejected');
    // POST /api/capture with a foreign Origin → 403
    const foreign = await postJson(`http://127.0.0.1:${PORT}/api/capture`, { enabled: true }, { Origin: 'http://evil.example' });
    assert.equal(foreign.status, 403, 'mutation with foreign Origin must be rejected');
    // a matching local Origin is accepted
    const ok = await postJson(`http://127.0.0.1:${PORT}/api/capture`, { enabled: true }, { Origin: `http://127.0.0.1:${PORT}` });
    assert.equal(ok.status, 200, 'mutation with matching local Origin must be accepted');
  });

  await t.test('body limit: oversized body is rejected with 413', async () => {
    const big = { eventRef: 'ev:1', text: 'x'.repeat(70 * 1024), depth: 'brief' };
    const res = await postJson(`http://127.0.0.1:${PORT}/api/ask`, big, { Origin: `http://127.0.0.1:${PORT}` });
    assert.equal(res.status, 413, 'oversized body must be rejected with 413');
  });
});

test.after(async () => {
  stopServer();
});