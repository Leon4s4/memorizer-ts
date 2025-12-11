#!/usr/bin/env node

// Force sharp to resolve to the bundled stub for offline installs
const { cpSync, existsSync, mkdirSync, rmSync } = require('fs');
const { dirname, join } = require('path');

const rootDir = join(__dirname, '..');
const nodeModules = join(rootDir, 'node_modules');
const stubPath = join(rootDir, 'stubs', 'sharp-stub');

if (!existsSync(nodeModules)) {
  process.exit(0);
}

const targets = [
  join(nodeModules, 'sharp'),
  join(nodeModules, '@xenova', 'transformers', 'node_modules', 'sharp'),
  join(nodeModules, '@xenova', 'transformers', 'sharp')
];

for (const target of targets) {
  try {
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }
    mkdirSync(dirname(target), { recursive: true });
    cpSync(stubPath, target, { recursive: true });
    console.log(`sharp stub applied at ${target}`);
  } catch (err) {
    console.warn(`could not patch sharp at ${target}: ${err.message}`);
  }
}
