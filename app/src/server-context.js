'use strict';

const { createApp } = require('./app');
const { wireHooks } = require('./capture/fixture-hooks');

const FILE = process.env.TRAMORA_DB || 'tramora.db';
// The fixture session is an authorized, declared dev fixture (no real data):
// capture permission is granted locally; remote sending stays disabled.
const app = createApp({ file: FILE, secrets: [], permission: true, captureEnabled: true, generatedBy: 'local-rules' });

wireHooks(app);

const sessionId = require('./capture/fixture-hooks').SESSION_ID;

function setPermission(value) {
  app.setPermission(value);
}

module.exports = { app, sessionId, setPermission };