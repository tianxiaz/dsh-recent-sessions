#!/usr/bin/env node
/**
 * Merge the version history back into a freshly generated market index.
 *
 * `make-market-index.mjs` always emits an index containing exactly one version
 * (the current package), which silently drops every earlier release when it is
 * committed. This script appends the versions found in the previously committed
 * index, orders them newest first, and validates the result with the official
 * `parseMarketIndex` from `@deepseek-ai/dsh-plugin-market-index`.
 *
 * Usage:
 *   node scripts/make-market-index.mjs --source git --repo ... --commit <sha> \
 *     --homepage ... --out market/index.json
 *   node scripts/merge-market-history.mjs            # default: previous = HEAD
 *
 * Options:
 *   --current <path>       Index just generated (default: market/index.json)
 *   --previous-ref <ref>   Git revision holding the previous index (default: HEAD)
 *   --previous <path>      Read the previous index from a file instead of git
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};

const currentPath = resolve(root, option('current', join('market', 'index.json')));
const previousRef = option('previous-ref', 'HEAD');
const previousPath = option('previous', '');

const current = JSON.parse(readFileSync(currentPath, 'utf8'));

let previous;
if (previousPath) {
  previous = JSON.parse(readFileSync(resolve(root, previousPath), 'utf8'));
} else {
  try {
    previous = JSON.parse(execFileSync('git', ['show', `${previousRef}:market/index.json`], { cwd: root, encoding: 'utf8' }));
  } catch (error) {
    console.log(`merge-market-history: no previous index at ${previousRef} (${error instanceof Error ? error.message.split('\n')[0] : error}); keeping the current file as is`);
    process.exit(0);
  }
}

const semver = (value) => String(value).split('.').map((part) => Number.parseInt(part, 10) || 0);
const byVersionDesc = (left, right) => {
  const a = semver(left.version);
  const b = semver(right.version);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (b[index] || 0) - (a[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
};

const merged = new Map();
for (const plugin of previous.plugins || []) {
  for (const version of plugin.versions || []) merged.set(`${plugin.name}@${version.version}`, version);
}
let added = 0;
for (const plugin of current.plugins || []) {
  for (const version of plugin.versions || []) {
    const key = `${plugin.name}@${version.version}`;
    if (!merged.has(key)) added += 1;
    merged.set(key, version);
  }
}
for (const plugin of current.plugins || []) {
  const own = [];
  for (const version of plugin.versions || []) {
    const stored = merged.get(`${plugin.name}@${version.version}`);
    if (stored) own.push(stored);
  }
  plugin.versions = own.sort(byVersionDesc);
}

const before = (previous.plugins || []).reduce((total, plugin) => total + (plugin.versions || []).length, 0);
const after = (current.plugins || []).reduce((total, plugin) => total + (plugin.versions || []).length, 0);
if (after < before) {
  console.error(`merge-market-history: refusing to write — ${after} versions, but ${before} existed before`);
  process.exit(1);
}

writeFileSync(currentPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
console.log(`merged: ${before} previous + ${added} new = ${after} versions (newest ${current.plugins[0].versions[0].version})`);

try {
  const { parseMarketIndex } = await import('@deepseek-ai/dsh-plugin-market-index');
  parseMarketIndex(current, 'https://example.com/market/index.json');
  console.log('validated with @deepseek-ai/dsh-plugin-market-index (format 1)');
} catch (error) {
  console.error(`merge-market-history: validation failed — ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
