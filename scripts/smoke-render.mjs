#!/usr/bin/env node
/**
 * Offscreen render smoke test for the client bundle.
 *
 * It mounts every component that receives a prop bag against a fake React and a
 * fake host context, so two classes of regression fail here instead of in the
 * browser:
 *
 *   1. a prop forwarded to a child but never destructured (ReferenceError at
 *      render time — this shipped in 0.2.3 and blanked the whole sidebar), and
 *   2. a row-menu label / rename dialog that loses its Chinese translation.
 *
 * Run with: node scripts/smoke-render.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'client.js'), 'utf8');

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

// ---------------------------------------------------------------------------
// Fake host: window/document/localStorage plus the module loader the bundle
// expects. Nothing here touches a real DOM; components are only evaluated.
// ---------------------------------------------------------------------------
const store = new Map();
const fakeWindow = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  },
  innerHeight: 900,
  innerWidth: 1200,
  addEventListener: () => {},
  removeEventListener: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  location: { reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};
const fakeDocument = {
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  body: { appendChild: () => {} },
  documentElement: { dataset: {} },
};
globalThis.window = fakeWindow;
globalThis.document = fakeDocument;

let factory;
fakeWindow.__ModuleLoader__ = { load: ({ factory: load }) => { factory = load; } };

// Expose the components under test by widening the module's return statement.
const patched = source.replace(
  '    return { inject, apply };',
  '    window.__smoke = { SidebarShell, RecentInlineGroup, RowMenu, RenameDialog, RecentSessionsPage, SidebarFallback };\n    return { inject, apply };',
);
new Function('window', 'document', patched)(fakeWindow, fakeDocument);

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useMemo: (compute) => compute(),
  useRef: (value) => ({ current: value }),
  Component: class {
    constructor(props) {
      this.props = props;
      this.state = {};
    }
  },
};
factory((name) => {
  if (name === 'react') return React;
  throw new Error('unexpected require: ' + name);
});

const components = fakeWindow.__smoke;
const t = (key) => key;

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}
const nodesOf = (tree, predicate) => {
  const found = [];
  walk(tree, (node) => {
    if (predicate(node)) found.push(node);
  });
  return found;
};
const textOf = (node) => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node !== 'object') return '';
  return (node.children || []).map(textOf).join('');
};
const render = (label, run) => {
  try {
    return run();
  } catch (error) {
    failures.push(`${label} threw at render: ${error && error.message}`);
    return undefined;
  }
};

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const now = Date.now();
const summaries = {
  s1: { id: 's1', displayTitle: 'Alpha', updatedAt: now - 1000, cwd: '/w', retainedBy: { mainView: 0 }, blank: false },
  s2: { id: 's2', displayTitle: 'Beta', updatedAt: now - 60000, cwd: '/w', retainedBy: {}, blank: false },
};
const sessionSnapshot = { ids: ['s1', 's2'], byId: summaries, phase: 'ready' };
const workspaceSnapshot = {
  items: [{ id: 'w1', title: 'W', path: '/w', sessionIds: ['s1', 's2'] }],
  archivedSessionIds: [],
  pinnedSessionIds: [],
};
const hooks = {
  useSessions: (selector) => selector(sessionSnapshot),
  useSessionStatus: (selector) => selector(new Map()),
  useWorkspaces: (selector) => selector(workspaceSnapshot),
  useFavorites: (selector) => selector([]),
};
store.set('dsh.recent-sessions.cats.v1', JSON.stringify({ recent: false }));

// ---------------------------------------------------------------------------
// 1. SidebarShell — the 0.2.3 regression: `renameSession` was forwarded to the
//    inline section but never destructured, so the whole sidebar threw.
// ---------------------------------------------------------------------------
const shellProps = {
  collapsed: false,
  width: 300,
  startSession: () => {},
  toggleSidebar: () => {},
  selectPanel: () => {},
  setPinned: () => {},
  toggleFavorite: () => {},
  addFavorite: () => {},
  insertFavoriteBefore: () => {},
  moveFavoriteToFront: () => {},
  openSession: () => {},
  pinSession: () => {},
  unpinSession: () => {},
  archiveSession: () => {},
  renameSession: () => {},
  usePanels: (selector) => selector([]),
  useEntryPins: (selector) => selector([]),
  useEntryActions: (selector) => selector(false),
  usePanelInfo: (selector) => selector({ activePanelId: undefined }),
  ...hooks,
  t,
  renderSlot: () => null,
};
const shell = render('SidebarShell', () => components.SidebarShell(shellProps));
check(shell !== undefined, 'SidebarShell did not render');
if (shell !== undefined) {
  check(nodesOf(shell, (n) => n.props && n.props.className === 'drs-regionArea').length === 1, 'SidebarShell lost its region area');
  const inline = nodesOf(shell, (n) => n.type === components.RecentInlineGroup);
  check(inline.length === 1, 'SidebarShell no longer mounts RecentInlineGroup');
  check(inline[0] && typeof inline[0].props.renameSession === 'function', 'SidebarShell does not forward renameSession to RecentInlineGroup');
}

// ---------------------------------------------------------------------------
// 2. RecentInlineGroup — rows render and each row keeps its "..." trigger.
// ---------------------------------------------------------------------------
const inlineProps = {
  wide: true,
  t,
  selectPanel: () => {},
  openSession: () => {},
  toggleFavorite: () => {},
  addFavorite: () => {},
  insertFavoriteBefore: () => {},
  moveFavoriteToFront: () => {},
  pinSession: () => {},
  unpinSession: () => {},
  archiveSession: () => {},
  renameSession: () => {},
  maxHeight: 300,
  ...hooks,
};
const inline = render('RecentInlineGroup', () => components.RecentInlineGroup(inlineProps));
if (inline !== undefined) {
  const rows = nodesOf(inline, (n) => n.props && n.props['data-drs-item'] === 'row');
  check(rows.length > 0, 'RecentInlineGroup rendered no session rows');
  const moreButtons = nodesOf(inline, (n) => n.props && n.props['aria-label'] === 'action.more');
  check(moreButtons.length === rows.length, 'a session row lost its "..." trigger');
}

// ---------------------------------------------------------------------------
// 3. RowMenu — every label resolves to a Chinese string, and rename is offered.
// ---------------------------------------------------------------------------
const menuProps = {
  t,
  menu: { id: 's1', title: 'Alpha', top: 10, left: 10 },
  favorite: false,
  pinned: false,
  onClose: () => {},
  onFavorite: () => {},
  onMoveToTop: () => {},
  onPin: () => {},
  onUnpin: () => {},
  onArchive: () => {},
  onRename: () => {},
};
const menu = render('RowMenu', () => components.RowMenu(menuProps));
if (menu !== undefined) {
  const items = nodesOf(menu, (n) => n.props && n.props.role === 'menuitem');
  const labels = items.map((item) => textOf(item));
  const expected = ['action.pin', 'action.rename', 'action.favorite', 'action.archive', 'action.copyId'];
  check(
    expected.every((key) => labels.includes(key)),
    `RowMenu is missing entries: expected ${expected.join(', ')} got ${labels.join(', ')}`,
  );
}

// ---------------------------------------------------------------------------
// 4. RenameDialog — input plus the confirm/cancel pair.
// ---------------------------------------------------------------------------
const dialog = render('RenameDialog', () =>
  components.RenameDialog({ t, value: 'Alpha', onChange: () => {}, onCancel: () => {}, onConfirm: () => {} }),
);
if (dialog !== undefined) {
  const input = nodesOf(dialog, (n) => n.type === 'input')[0];
  check(!!input && input.props.value === 'Alpha', 'RenameDialog does not show the current title');
  const buttons = nodesOf(dialog, (n) => n.type === 'button').map(textOf);
  check(buttons.includes('rename.confirm') && buttons.includes('rename.cancel'), 'RenameDialog lost its confirm/cancel buttons');
}

// ---------------------------------------------------------------------------
// 4b. RenameDialog in flight / failed — the dialog must never close silently on
//     a rejected rename (0.2.3/0.2.4 did exactly that).
// ---------------------------------------------------------------------------
const dialogPending = render('RenameDialog(pending)', () =>
  components.RenameDialog({ t, value: 'Alpha', pending: true, onChange: () => {}, onCancel: () => {}, onConfirm: () => {} }),
);
if (dialogPending !== undefined) {
  const buttons = nodesOf(dialogPending, (n) => n.type === 'button');
  check(buttons.every((button) => button.props.disabled === true), 'RenameDialog keeps an enabled button while a rename is in flight');
  check(buttons.some((button) => textOf(button) === 'rename.saving'), 'RenameDialog lost its saving label');
  const input = nodesOf(dialogPending, (n) => n.type === 'input')[0];
  check(!!input && input.props.disabled === true, 'RenameDialog keeps the input editable while saving');
}

const dialogError = render('RenameDialog(error)', () =>
  components.RenameDialog({ t, value: 'Alpha', error: 'boom', onChange: () => {}, onCancel: () => {}, onConfirm: () => {} }),
);
if (dialogError !== undefined) {
  const alerts = nodesOf(dialogError, (n) => n.props && n.props.role === 'alert');
  check(alerts.length === 1, 'RenameDialog does not surface a rename failure');
  check(alerts[0] && textOf(alerts[0]).includes('rename.failed'), 'RenameDialog failure text is not localised');
}

// ---------------------------------------------------------------------------
// 5. RecentSessionsPage — the full-session panel still maps sessions to groups.
// ---------------------------------------------------------------------------
const pageProps = {
  t,
  toggleFavorite: () => {},
  addFavorite: () => {},
  insertFavoriteBefore: () => {},
  moveFavoriteToFront: () => {},
  openSession: () => {},
  ...hooks,
};
store.set('dsh.recent-sessions.cats.v1', '{}');
const page = render('RecentSessionsPage', () => components.RecentSessionsPage(pageProps));
if (page !== undefined) {
  const sections = nodesOf(page, (n) => n.props && String(n.props.className || '').includes('drs-section'));
  check(sections.length > 0, 'RecentSessionsPage rendered no category sections');
  const text = nodesOf(page, () => true).map(textOf).join(' ');
  check(text.includes('Alpha') && text.includes('Beta'), 'RecentSessionsPage dropped the session rows');
}

// ---------------------------------------------------------------------------
// 6. Chinese dictionary — every label the row menu uses must exist in `zh`.
// ---------------------------------------------------------------------------
const zhBlock = source.slice(source.indexOf('const zh = {'), source.indexOf('const en = {'));
const zh = new Map();
for (const match of zhBlock.matchAll(/'([\w.]+)':\s*'((?:[^'\\]|\\.)*)'/g)) zh.set(match[1], match[2]);
for (const key of ['action.pin', 'action.unpin', 'action.favorite', 'action.unfavorite', 'action.moveToTop', 'action.archive', 'action.copyId', 'action.rename', 'rename.title', 'rename.confirm', 'rename.cancel']) {
  const value = zh.get(key);
  check(!!value && /[\u4e00-\u9fff]/.test(value), `zh dictionary has no Chinese label for ${key}`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (failures.length) {
  console.error(`smoke-render: ${failures.length} failure(s)`);
  for (const failure of failures) console.error('  - ' + failure);
  process.exit(1);
}
console.log('smoke-render: OK (sidebar shell, inline section, row menu, rename dialog, zh labels)');
