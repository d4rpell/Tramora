'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      out.push(...walk(p));
    } else if (entry.name.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

let failed = 0;
for (const file of walk(root)) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    failed += 1;
    console.error(`syntax error in ${file}`);
    console.error((err.stderr && err.stderr.toString()) || err.message);
  }
}

if (failed === 0) {
  console.log('lint: all files pass node --check');
} else {
  console.error(`lint: ${failed} file(s) failed`);
}
process.exit(failed ? 1 : 0);
