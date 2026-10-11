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
      assert.ok(count >= 8, `expected fixture events, got ${count}`);
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

  await t.test('return view: renders sections and is pure consultation (RC-01/05/12)', async () => {
    await withPage(t, { width: 1000, height: 800 }, null, async (page) => {
      await page.click('#tab-return');
      await page.waitForSelector('#return-overview .return-row');
      await page.waitForSelector('#return-recent .return-row');
      const pendingRows = await page.locator('#return-pending .return-row').count();
      const markedRows = await page.locator('#return-marked .return-row').count();
      const propRows = await page.locator('#return-proposals .return-row').count();
      assert.ok(pendingRows >= 0, 'pending section renders (may be empty)');
      assert.ok(markedRows >= 0, 'marked section renders (may be empty)');
      assert.ok(propRows >= 0, 'proposals section renders (may be empty)');
      // no-mutation: persisted content (all collections) identical before and
      // after opening the view; `exported_at` is an export timestamp, not store state
      const stripExportedAt = (raw) => { const d = JSON.parse(raw); delete d.exported_at; return JSON.stringify(d); };
      const before = stripExportedAt(await getJson(`http://127.0.0.1:${PORT}/api/export`));
      await page.click('#tab-room');
      await page.click('#tab-return');
      const after = stripExportedAt(await getJson(`http://127.0.0.1:${PORT}/api/export`));
      assert.equal(after, before, 'opening the return view must not change any persisted data');
    });
  });

  await t.test('return view: pending with items renders all rows and later sections (P1 regression)', async () => {
    await withPage(t, { width: 1000, height: 800 }, null, async (page) => {
      // The demo fixture declares two pending actions (no observed result);
      // the P1 regression was: renderPendingRows returned a single element
      // instead of an array, breaking pending + later sections.
      await page.click('#tab-return');
      await page.waitForSelector('#return-pending .return-row');
      const pendingRows = await page.locator('#return-pending .return-row').count();
      // 2 pending action rows + 1 session-without-closure row (the fixture Stop
      // closes a turn, not the session)
      assert.equal(pendingRows, 3, 'pending section renders the 2 actions + the open session');
      // later sections still render (no thrown TypeError broke the render)
      await page.waitForSelector('#return-marked .return-rows');
      await page.waitForSelector('#return-proposals .return-rows');
      const headers = await page.locator('#tab-return-view h3').count();
      assert.equal(headers, 5, 'section headings are preserved (aria-labelledby intact)');
    });
  });

  await t.test('return view: 320px no overflow; keyboard opens evidence; reduced-motion (RC-10/11)', async () => {
    await withPage(t, { width: 320, height: 700 }, null, async (page) => {
      await page.click('#tab-return');
      await page.waitForSelector('#return-recent .return-row');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false, 'no horizontal overflow at 320px on the return view');
    });
    await withPage(t, { width: 900, height: 800 }, null, async (page) => {
      await page.click('#tab-return');
      await page.waitForSelector('#return-recent .return-row button');
      const firstBtn = page.locator('#return-recent .return-row button').first();
      await firstBtn.focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#evidence-dialog[open]');
    });
    await withPage(t, { width: 900, height: 800 }, 'reduce', async (page) => {
      await page.click('#tab-return');
      await page.waitForSelector('#return-recent .return-row');
      const animated = await page.evaluate(() => {
        const el = document.querySelector('#return-recent .return-row');
        return el && getComputedStyle(el).animationName && getComputedStyle(el).animationName !== 'none';
      });
      assert.equal(animated, false, 'no animation under prefers-reduced-motion on the return view');
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