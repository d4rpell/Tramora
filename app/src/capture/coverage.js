'use strict';

const COVERAGE = Object.freeze({
  CAPTURED: 'captured',
  UNKNOWN: 'unknown_coverage',
  STOPPED: 'capture stopped',
  NO_PERMISSION: 'no permission',
  GAP: 'gap',
});

/**
 * Declared coverage of the observed source. `permission` here means
 * permission to capture that source (a session without permission is
 * declared `no permission`); it is independent of the remote-send
 * permission of the explanation flow (spec §4).
 */
function coverageFor({ captureEnabled, permission, hasSignals }) {
  if (!permission) return COVERAGE.NO_PERMISSION;
  if (!captureEnabled) return COVERAGE.STOPPED;
  if (!hasSignals) return COVERAGE.UNKNOWN;
  return COVERAGE.CAPTURED;
}

module.exports = { COVERAGE, coverageFor };
