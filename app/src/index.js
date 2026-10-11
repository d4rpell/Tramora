'use strict';

const { createApp } = require('./app');
const { wireHooks, SESSION_ID } = require('./capture/fixture-hooks');

module.exports = {
  createApp,
  wireHooks,
  SESSION_ID,
};