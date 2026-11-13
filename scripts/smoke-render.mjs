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
  // Real timers, pinned to 0 ms: the action layer awaits one before it decides an
  // archive did not land. Notice auto-dismiss timers are why the run ends with an
  // explicit exit instead of waiting for the loop to drain.
  setTimeout: (fn) => setTimeout(fn, 0),
  clearTimeout: (timer) => clearTimeout(timer),
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
  `    window.__smoke = { SidebarShell, RecentInlineGroup, RowMenu, RenameDialog, RecentSessionsPage, SidebarFallback, inject, apply };
    // Older bundles do not export every component; typeof keeps this harness usable
    // against them too, which is how the historical failure gets reproduced.
    window.__smoke.ConfirmDialog = typeof ConfirmDialog === 'function' ? ConfirmDialog : undefined;
    return { inject, apply };`,
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
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node !== 'object') return '';
  return (node.children || []).map(textOf).join('');
};
// Every interactive prop we know how to drive, with an event stub that answers
// the questions a handler may ask (key, target/currentTarget, rect, preventDefault).
const eventStub = () => {
  const node = {
    getAttribute: () => 'false',
    getBoundingClientRect: () => ({ top: 10, bottom: 30, left: 10, right: 60, width: 50, height: 20 }),
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    click: () => {},
    scrollIntoView: () => {},
    style: {},
    textContent: '',
    value: 'Alpha',
    dataset: {},
  };
  return {
    key: 'Enter',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target: node,
    currentTarget: node,
    dataTransfer: { dropEffect: '', types: [], getData: () => 's1', setData: () => {} },
    preventDefault: () => {},
    stopPropagation: () => {},
  };
};

/**
 * Press every button in a rendered tree. A handler that references a prop the
 * component never bound throws here instead of in the browser — that is exactly
 * how "archive" and "rename" died in 0.2.3–0.2.5.
 */
const pressEveryButton = (tree, label) => {
  let pressed = 0;
  walk(tree, (node) => {
    if (!node.props) return;
    for (const prop of ['onClick', 'onChange', 'onKeyDown', 'onPointerDown', 'onScroll', 'onDragOver', 'onDragLeave', 'onDrop', 'onDragStart', 'onMouseEnter', 'onFocus']) {
      const handler = node.props[prop];
      if (typeof handler !== 'function') continue;
      pressed += 1;
      try {
        const result = handler(eventStub());
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } catch (error) {
        failures.push(`${label}: ${prop} handler threw — ${error && error.message}`);
      }
    }
  });
  return pressed;
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
  useNotices: (selector) => selector(null),
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
  archiveSession: () => Promise.resolve(),
  renameSession: () => Promise.resolve(),
  notify: () => {},
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
  archiveSession: () => Promise.resolve(),
  renameSession: () => Promise.resolve(),
  notify: () => {},
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
  notify: () => {},
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
// 4c. Session actions — every row button must reach a real host call, and an
//     action that the host refuses must not stay silent.
// ---------------------------------------------------------------------------
const actionCalls = [];
const actionInline = render('RecentInlineGroup(actions)', () =>
  components.RecentInlineGroup({
    ...inlineProps,
    archiveSession: (id, options) => {
      actionCalls.push([id, options]);
      return Promise.resolve();
    },
    // one running session so the confirm path can be observed
    useSessionStatus: (selector) => selector(new Map([['s2', { running: true }]])),
  }),
);
if (actionInline !== undefined) {
  const archiveButtons = nodesOf(actionInline, (n) => n.props && n.props['aria-label'] === 'action.archive');
  check(archiveButtons.length >= 2, 'session rows lost their archive button');
  const event = eventStub();
  for (const button of archiveButtons) {
    try {
      button.props.onClick(event);
    } catch (error) {
      failures.push(`archiving from a row threw — ${error && error.message}`);
    }
  }
  const archivedIds = actionCalls.map(([id]) => id);
  check(archivedIds.includes('s1'), 'archiving an idle session never reached the host');
  check(archivedIds.includes('s2'), 'a running session never asked the host — the refusal drives the question');
  check(
    actionCalls.every(([, options]) => options && options.stopActivity !== true),
    'a first archive attempt asked the host to stop work',
  );
}

// Copy shows a confirmation; clipboard failure shows a retry line instead.
const copyNotices = [];
const menuWithNotify = render('RowMenu(notify)', () =>
  components.RowMenu({ ...menuProps, notify: (key) => copyNotices.push(key) }),
);
if (menuWithNotify !== undefined) {
  const copyButton = nodesOf(menuWithNotify, (n) => n.props && n.props.role === 'menuitem' && textOf(n) === 'action.copyId')[0];
  check(!!copyButton, 'row menu lost its copy entry');
  if (copyButton) {
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: () => Promise.resolve() } },
      configurable: true,
    });
    copyButton.props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    check(copyNotices.includes('copied.id'), 'copying a session ID gave no confirmation');
  }
}

// The archive confirm renders the session it is about.
const confirm = components.ConfirmDialog
  ? render('ConfirmDialog', () =>
      components.ConfirmDialog({
        t,
        title: 'archive.confirm.title',
        body: 'archive.confirm.desc',
        activity: [{ kind: 'schedule', items: [{ id: 'sched-1', label: '每日晨间回顾' }] }],
        confirmLabel: 'archive.confirm.action',
        onCancel: () => {},
        onConfirm: () => {},
      }),
    )
  : undefined;
if (confirm !== undefined) {
  const buttons = nodesOf(confirm, (n) => n.type === 'button').map(textOf);
  check(buttons.includes('archive.confirm.action'), 'archive confirm lost its confirm button');
  check(buttons.includes('rename.cancel'), 'archive confirm lost its cancel button');
  const list = nodesOf(confirm, (n) => n.type === 'ul')[0];
  check(!!list, 'archive confirm does not list the work that will be stopped');
  check(textOf(list).includes('archive.confirm.schedules.one'), 'archive confirm does not name the scheduled reminder');
}

// ---------------------------------------------------------------------------
// 4d. Plugin wiring — every ctx service the code reads must be injected, and
//     the session controller must be among them (0.2.3 shipped without it).
// ---------------------------------------------------------------------------
const injectMatch = source.match(/const inject = \[([^\]]*)\]/);
check(!!injectMatch, 'plugin no longer declares a client inject list');
if (injectMatch) {
  const declared = injectMatch[1].split(',').map((name) => name.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  for (const required of ['slots', 'layout', 'uiWorkspace', 'locale', 'sessions']) {
    check(declared.includes(required), `client inject list is missing "${required}"`);
  }
  const accessed = [...new Set([...source.matchAll(/ctx\.([a-zA-Z][a-zA-Z0-9]*)\b/g)].map((m) => m[1]))];
  const allowed = new Set([...declared, 'get', 'effect']);
  const unDeclared = accessed.filter((name) => !allowed.has(name));
  check(unDeclared.length === 0, `ctx services read without inject: ${unDeclared.join(', ')}`);
}

// ---------------------------------------------------------------------------
// 4e. Action layer through the real plugin wiring: a host that accepts the call
//     but refuses to archive must still be reported, not swallowed.
// ---------------------------------------------------------------------------
const registrations = new Map();
const noticeKeys = [];
let archivedState = [];
const hostCalls = [];
const fakeWorkspaces = {
  list: { getSnapshot: () => ({ archivedSessionIds: archivedState, items: [], pinnedSessionIds: [] }) },
};
const fakeCtx = {
  effect: (run) => {
    run();
    return () => {};
  },
  locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {} },
  slots: {
    inject: (name, register) => {
      register();
      return () => {};
    },
    register: (options) => {
      registrations.set(options.name, options);
      return () => {};
    },
    entriesOfSlot: () => [],
    subscribe: () => () => {},
  },
  layout: {
    panelInfo: { getSnapshot: () => null, subscribe: () => () => {} },
    toggleSidebar: () => hostCalls.push(['toggleSidebar']),
    selectPanel: (id) => hostCalls.push(['selectPanel', id]),
  },
  uiWorkspace: {
    openSession: (id) => {
      hostCalls.push(['openSession', id]);
      return Promise.resolve();
    },
    pinSession: () => Promise.resolve({ ok: true }),
    unpinSession: () => Promise.resolve({ ok: true }),
    archiveSession: (id, options) => {
      hostCalls.push(['archiveSession', id, options]);
      return Promise.resolve();
    },
    startSession: () => {},
    clearMain: () => {},
  },
  get: (name) => {
    if (name === 'workspaces') return fakeWorkspaces;
    if (name === 'sessions') {
      return { using: () => Promise.resolve({ ok: true }) };
    }
    return undefined;
  },
};
components.apply(fakeCtx);
const sidebarOptions = registrations.get('sidebar');
check(!!sidebarOptions && typeof sidebarOptions.inject === 'function', 'the sidebar slot no longer injects its actions');
const sidebarProps = sidebarOptions ? sidebarOptions.inject() : {};
const noticeSource = sidebarProps.hooks && sidebarProps.hooks.notices;
check(!!noticeSource, 'the sidebar no longer exposes a notice channel');
if (noticeSource) {
  const read = () => noticeSource.getSnapshot();
  noticeSource.subscribe(() => {
    const current = read();
    if (current) noticeKeys.push(current.key);
  });

  const realError = console.error;
  console.error = () => {};

  // The host "succeeds" without archiving: still a failure, but the caller turns
  // it into the stop-and-archive question, so the action layer stays quiet.
  const beforeNoop = noticeKeys.length;
  await sidebarProps.archiveSession('s1', {}).then(
    () => failures.push('a host that did not archive was reported as success'),
    (error) => check(error.code === 'archive/noop', `unexpected refusal code: ${error && error.code}`),
  );
  check(noticeKeys.length === beforeNoop, 'a no-op archive toasted instead of asking');

  // A busy session arrives as WorkspaceArchiveError with the activity list, and
  // must not be toasted either — the dialog names the work that will stop.
  const busy = Object.assign(new Error('workspace session archive failed: workspace/session-active: busy'), {
    name: 'WorkspaceArchiveError',
    rpcError: {
      code: 'workspace/session-active',
      message: 'the session is active (schedule)',
      details: { activity: [{ kind: 'schedule', items: [{ id: 'sched-1', label: '每日晨间回顾' }] }] },
    },
  });
  fakeCtx.uiWorkspace.archiveSession = () => Promise.reject(busy);
  const beforeBusy = noticeKeys.length;
  await sidebarProps.archiveSession('s3', {}).then(
    () => failures.push('a busy session was archived without asking'),
    (error) => {
      const activity = error && error.rpcError && error.rpcError.details && error.rpcError.details.activity;
      check(Array.isArray(activity) && activity[0].kind === 'schedule', 'the refusal lost its activity list');
    },
  );
  check(noticeKeys.length === beforeBusy, 'a busy session toasted instead of asking');
  fakeCtx.uiWorkspace.archiveSession = (id, options) => {
    hostCalls.push(['archiveSession', id, options]);
    return Promise.resolve();
  };

  // Anything else is a real failure and must be shown.
  fakeCtx.uiWorkspace.archiveSession = () => Promise.reject(new Error('carrier fault'));
  const beforeFault = noticeKeys.length;
  await sidebarProps.archiveSession('s4', {}).catch(() => {});
  check(noticeKeys.length > beforeFault && noticeKeys.includes('error.archiveFailed'), 'a real archive failure stayed silent');
  fakeCtx.uiWorkspace.archiveSession = (id, options) => {
    hostCalls.push(['archiveSession', id, options]);
    return Promise.resolve();
  };
  console.error = realError;

  // A host that really archives resolves and stays quiet.
  archivedState = ['s2'];
  const before = noticeKeys.length;
  await sidebarProps.archiveSession('s2', {});
  check(noticeKeys.length === before, 'a successful archive still reported a failure');
}

// ---------------------------------------------------------------------------
// 4f. Press every button on every surface: no handler may reference a name the
//     component never bound.
// ---------------------------------------------------------------------------
if (shell !== undefined) {
  const pressed = pressEveryButton(shell, 'SidebarShell');
  check(pressed >= 1, 'SidebarShell exposed no interactive handlers');
}
if (inline !== undefined) {
  const pressed = pressEveryButton(inline, 'RecentInlineGroup');
  check(pressed > 5, `RecentInlineGroup exposed only ${pressed} interactive handlers`);
}
if (menu !== undefined) {
  pressEveryButton(menu, 'RowMenu');
}
if (dialog !== undefined) {
  pressEveryButton(dialog, 'RenameDialog');
}
if (confirm !== undefined) {
  pressEveryButton(confirm, 'ConfirmDialog');
}
// ---------------------------------------------------------------------------
// 5. RecentSessionsPage — the full-session panel still maps sessions to groups.
// ---------------------------------------------------------------------------
const pageProps = {
  t,
  useNotices: (selector) => selector(null),
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
  const pressed = pressEveryButton(page, 'RecentSessionsPage');
  check(pressed > 3, `RecentSessionsPage exposed only ${pressed} interactive handlers`);
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
console.log('smoke-render: OK (sidebar shell, inline section, row menu, rename dialog, panel page, action wiring)');
process.exit(0);
