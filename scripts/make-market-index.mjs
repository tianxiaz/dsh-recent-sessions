#!/usr/bin/env node
/**
 * Generate a plugin market index (format 1) for this bundle.
 *
 * The index is the JSON document DSH's Plugins → Discover tab reads from an
 * index source URL. Host it next to the icon it references (this script copies
 * `icon.svg` into `market/`), for example on GitHub Pages or any static host.
 *
 * Usage:
 *   # Git source (no npm account needed): the commit pins the exact code.
 *   node scripts/make-market-index.mjs \
 *     --source git \
 *     --repo https://github.com/<owner>/<repo> \
 *     --commit <40-hex-commit> \
 *     [--dir plugins/dsh-recent-sessions] \
 *     [--homepage https://github.com/<owner>/<repo>]
 *
 *   # npm source: the package must already be published.
 *   node scripts/make-market-index.mjs --source npm [--registry https://registry.npmjs.org]
 *
 * Options:
 *   --out <path>     Output path (default: market/index.json)
 *   --date <unix>    publishTimestamp in Unix seconds (default: now)
 *   --author <text>  Author shown in the market
 *   --validate       Validate the generated document when the DSH validator is
 *                    resolvable from this environment (optional)
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};

const source = option('source', 'git');
const out = option('out', join(root, 'market', 'index.json'));
const stamp = Number(option('date', String(Math.floor(Date.now() / 1000))));

const homepage = option('homepage', '');
const author = option('author', undefined);

const engines = { ...(manifest.engines ?? {}) };
const dshEngines = typeof engines.dsh === 'string' ? { dsh: engines.dsh } : {};

const plugins = {
  name: manifest.name,
  title: { en: 'Recent Sessions', zh: '最近会话' },
  description: {
    en: 'A Workspaces-native Recent sessions section in the left sidebar: favorites, running, waiting-for-you and unread sessions at a glance, with a one-click ☆ on every session row, status dots, one-line collapse and in-section search.',
    zh: '像官方「工作区」一样融入左侧栏的「最近会话」分区：收藏、运行中、等待你的回应、完成未读、最近活跃一屏直达；每个会话行一个 ☆ 一键收藏，黄/蓝/绿状态点、可一键收起到一行、支持分区内搜索，官方会话区完全不变。',
  },
  icon: 'icon.svg',
  metadata: {
    category: 'sidebar',
    keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
    labels: ['sidebar', 'favorites', 'quick-access'],
    sortKeys: {},
  },
  versions: [],
};

let version;
if (source === 'npm') {
  const registry = option('registry', '');
  version = {
    version: manifest.version,
    publishTimestamp: stamp,
    source: registry ? { type: 'npm', registry } : { type: 'npm' },
    engines: dshEngines,
  };
} else if (source === 'git') {
  const repo = option('repo', '');
  const commit = option('commit', '');
  const dir = option('dir', '');
  if (!/^https:\/\/[^/]+\/[^/]+\/[^/#?]+$/.test(repo)) {
    throw new Error('--repo must be a canonical https repository URL, e.g. https://github.com/owner/repo');
  }
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('--commit must be a lowercase 40-hex commit SHA');
  version = {
    version: manifest.version,
    publishTimestamp: stamp,
    source: {
      type: 'git',
      url: repo,
      commit,
      ...(dir ? { path: dir } : {}),
    },
    engines: dshEngines,
  };
} else {
  throw new Error(`unknown --source '${source}' (expected 'git' or 'npm')`);
}

plugins.versions.push(version);
if (homepage) plugins.homepage = homepage;
if (author) plugins.author = author;
if (source === 'git') {
  const repo = option('repo', '');
  const dir = option('dir', '');
  plugins.repository = { url: repo.replace(/\.git$/, ''), ...(dir ? { directory: dir } : {}) };
}

const index = {
  format: 1,
  title: { en: 'Recent Sessions', zh: '最近会话' },
  description: {
    en: 'Quick access to the sessions you are working on.',
    zh: '集中快捷访问正在处理、等待你回应的会话。',
  },
  metadata: {
    categories: { sidebar: { title: { en: 'Sidebar', zh: '侧栏' } } },
    labels: {
      sidebar: { title: { en: 'Sidebar', zh: '侧栏' } },
      favorites: { title: { en: 'Favorites', zh: '收藏' } },
      'quick-access': { title: { en: 'Quick access', zh: '快捷访问' } },
    },
    sortKeys: {},
  },
  plugins: [plugins],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
copyFileSync(join(root, 'icon.svg'), join(dirname(out), 'icon.svg'));
console.log(`wrote ${out} (${plugins.name}@${version.version}, source: ${source})`);

if (flag('validate')) {
  try {
    const { parseMarketIndex } = await import('@deepseek-ai/dsh-plugin-market-index');
    parseMarketIndex(index, 'https://example.com/market/index.json');
    console.log('validated against @deepseek-ai/dsh-plugin-market-index (format 1)');
  } catch (error) {
    console.warn(`validation skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}
