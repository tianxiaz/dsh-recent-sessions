/**
 * dsh-recent-sessions — the browser half.
 *
 * Adds three things to the Harness Web UI:
 *   1. a sidebar entry ("最近会话") in the global panel list,
 *   2. the panel page it selects, grouping sessions by what the user needs to
 *      do next: waiting for you (yellow), running, unread completions (green),
 *      favorites, and recently active sessions,
 *   3. a star hover button on every shipped Session row that toggles the
 *      favorite list the panel's "收藏" section renders.
 *
 * Session rows, statuses and workspaces come from the framework's global
 * standard hooks (`useSessions`, `useSessionStatus`, `useWorkspaces`); the
 * favorite list is plugin-owned UI state persisted in localStorage and shared
 * by the panel and the row button through one observable source.
 */
window.__ModuleLoader__.load({
  id: 'dsh-recent-sessions',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useState } = React;

    /** Locale namespace owned by this plugin. */
    const NS = 'recent-sessions';
    /** Sidebar entry id — also the `main` key that renders the panel. */
    const PANEL_ID = 'recent-sessions';
    /** Persisted favorite session ids (browser-local quick-access state). */
    const FAVORITES_KEY = 'dsh.recent-sessions.favorites.v1';
    /** How many plain "recently active" rows the panel shows. */
    const RECENT_LIMIT = 8;
    /**
     * How long "I just opened it" counts as activity. Opening a Session is a
     * view, not a durable update, so the boost is deliberately short: after
     * this window the row falls back to the Session's real durable timestamp.
     */
    const VIEW_BOOST_MS = 10 * 60 * 1000;
    /** Height the inline section header, its margins and the divider take before any row. */
    const SECTION_CHROME = 46;
    /** Drag payload type this plugin sets on its own rows. */
    const DRAG_TYPE = 'application/x-dsh-recent-session';

    // #region locales
    /** Simplified Chinese dictionary (the key-set source of truth). */
    const zh = {
      'page.title': '最近会话',
      'page.subtitle':
        '运行中、等待你回应、完成未读和收藏的会话集中在这里。把会话行拖到「收藏」，或点会话旁的 ☆ 即可固定。',
      'page.loading': '正在载入会话…',
      'page.empty': '还没有会话：先在左侧新建一个会话。',
      'section.favorites': '收藏',
      'section.pending': '等待你的回应',
      'section.running': '运行中',
      'section.unread': '完成未读',
      'section.recent': '最近活跃',
      'empty.favorites': '把会话行拖到这里，或点会话旁的 ☆ 收藏',
      'hint.drop': '松开即可收藏',
      'dot.pending': '等待你授权或回答',
      'dot.running': '运行中',
      'dot.unread': '已运行完成，尚未查看',
      'dot.idle': '空闲',
      'action.favorite': '收藏会话',
      'action.unfavorite': '取消收藏',
      'action.open': '打开会话',
      'time.now': '刚刚',
      'time.min': '{n} 分钟前',
      'time.hour': '{n} 小时前',
      'time.day': '{n} 天前',
      'shell.newSession': '新会话',
      'shell.newSession.label': '新建会话',
      'shell.toggle.open': '打开侧边栏',
      'shell.toggle.collapse': '收起侧边栏',
      'shell.panels': '全局面板',
      'shell.more': '更多',
      'shell.brand': 'dsh',
      'inline.title': '最近会话',
      'inline.expand': '展开其余 {n} 个会话',
      'inline.collapse': '收起',
      'inline.drop': '松开即可收藏',
      'inline.favEmpty': '拖到此处或点 ☆ 收藏',
      'inline.favHint': '拖入或点 ☆ 收藏',
      'inline.search': '搜索会话',
      'inline.search.placeholder': '搜索最近会话',
      'inline.search.clear': '关闭搜索',
      'inline.search.empty': '没有匹配的会话',
      'inline.search.more': '还有 {n} 条，输入更多关键词缩小范围',
      'inline.noSessions': '还没有会话：先在左侧新建一个',
      'inline.crashed': '侧栏组件出错，已切回官方会话列表',
      'inline.failed': '最近会话加载失败，详情见控制台',
      'inline.reload': '重新加载',
      'inline.pending.approval': '待授权',
      'inline.pending.question': '待回答',
      'inline.pending.other': '待回应',
      'inline.collapseAll': '收起',
      'inline.expandAll': '展开',
      'inline.openPanel': '在面板中打开',
    };
    /** English dictionary, checked complete against the zh key set. */
    const en = {
      'page.title': 'Recent sessions',
      'page.subtitle':
        'Running sessions, ones waiting for you, unread completions and favorites in one place. Drag a session row onto Favorites, or click the ☆ beside it.',
      'page.loading': 'Loading sessions…',
      'page.empty': 'No sessions yet — start one from the sidebar.',
      'section.favorites': 'Favorites',
      'section.pending': 'Waiting for you',
      'section.running': 'Running',
      'section.unread': 'Unread completions',
      'section.recent': 'Recently active',
      'empty.favorites': 'Drag a session row here, or click the ☆ beside a session',
      'hint.drop': 'Release to favorite',
      'dot.pending': 'Waiting for your approval or answer',
      'dot.running': 'Running',
      'dot.unread': 'Finished running, not viewed yet',
      'dot.idle': 'Idle',
      'action.favorite': 'Favorite session',
      'action.unfavorite': 'Remove from favorites',
      'action.open': 'Open session',
      'time.now': 'just now',
      'time.min': '{n} min ago',
      'time.hour': '{n} h ago',
      'time.day': '{n} d ago',
      'shell.newSession': 'New session',
      'shell.newSession.label': 'New session',
      'shell.toggle.open': 'Open sidebar',
      'shell.toggle.collapse': 'Collapse sidebar',
      'shell.panels': 'Global panels',
      'shell.more': 'More',
      'shell.brand': 'dsh',
      'inline.title': 'Recent sessions',
      'inline.expand': 'Show {n} more sessions',
      'inline.collapse': 'Collapse',
      'inline.drop': 'Release to favorite',
      'inline.favEmpty': 'Drag here, or click ☆ to favorite',
      'inline.favHint': 'Drag in or ☆',
      'inline.search': 'Search sessions',
      'inline.search.placeholder': 'Search recent sessions',
      'inline.search.clear': 'Close search',
      'inline.search.empty': 'No matching sessions',
      'inline.search.more': '{n} more matches — type more to narrow it down',
      'inline.noSessions': 'No sessions yet — start one from the sidebar',
      'inline.crashed': 'The sidebar component failed — showing the built-in session list',
      'inline.failed': 'Recent sessions failed to load — see the console',
      'inline.reload': 'Reload',
      'inline.pending.approval': 'Approval',
      'inline.pending.question': 'Question',
      'inline.pending.other': 'Waiting',
      'inline.collapseAll': 'Collapse',
      'inline.expandAll': 'Expand',
      'inline.openPanel': 'Open in panel',
    };
    // #endregion

    // #region favorites store
    /**
     * Read the persisted favorite ids, dropping anything that is not a unique
     * non-empty string. Storage failures are not fatal: the list then starts
     * empty for this page load.
     */
    function loadFavoriteIds() {
      try {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const ids = [];
        for (const value of parsed) {
          if (typeof value === 'string' && value && ids.indexOf(value) < 0) ids.push(value);
        }
        return ids;
      } catch (error) {
        return [];
      }
    }

    /**
     * One observable favorite list shared by the panel and every session-row
     * star. The snapshot keeps its identity until the list actually changes, so
     * subscribers are not woken by unrelated renders.
     */
    function createFavorites() {
      let ids = loadFavoriteIds();
      let snapshot = ids.slice();
      const listeners = new Set();

      const publish = () => {
        snapshot = ids.slice();
        for (const listener of [...listeners]) {
          try {
            listener();
          } catch (error) {
            console.error('recent-sessions: favorite listener failed', error);
          }
        }
      };
      const commit = (next) => {
        ids = next;
        try {
          window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
        } catch (error) {
          /* storage may be unavailable (private mode); keep the in-memory list */
        }
        publish();
      };
      const add = (sessionId) => {
        if (ids.indexOf(sessionId) >= 0) return;
        commit(ids.concat([sessionId]));
      };
      const remove = (sessionId) => {
        if (ids.indexOf(sessionId) < 0) return;
        commit(ids.filter((value) => value !== sessionId));
      };
      const moveToFront = (sessionId) => {
        if (ids.indexOf(sessionId) <= 0) return;
        commit([sessionId].concat(ids.filter((value) => value !== sessionId)));
      };
      const insertBefore = (sessionId, beforeId) => {
        if (sessionId === beforeId) return;
        const rest = ids.filter((value) => value !== sessionId);
        const at = rest.indexOf(beforeId);
        if (at < 0) {
          commit(rest.concat([sessionId]));
          return;
        }
        commit(rest.slice(0, at).concat([sessionId], rest.slice(at)));
      };
      const toggle = (sessionId) => {
        if (ids.indexOf(sessionId) >= 0) remove(sessionId);
        else add(sessionId);
      };

      const source = {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      };
      return { source, add, remove, moveToFront, insertBefore, toggle };
    }
    // #endregion

    // #region utilities
    /** Last path segment of a host directory, for a compact row subtitle. */
    function basename(path) {
      const text = String(path || '').replace(/[/\\]+$/, '');
      if (!text) return '';
      const at = Math.max(text.lastIndexOf('/'), text.lastIndexOf('\\'));
      return text.slice(at + 1);
    }

    /** Short relative time, resolved through the plugin's locale namespace. */
    function relativeLabel(updatedAt, now, t) {
      const elapsed = Math.max(0, now - updatedAt);
      const minutes = Math.floor(elapsed / 60000);
      if (minutes < 1) return t('time.now');
      if (minutes < 60) return t('time.min', { n: minutes });
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t('time.hour', { n: hours });
      const days = Math.floor(hours / 24);
      if (days < 7) return t('time.day', { n: days });
      try {
        return new Date(updatedAt).toLocaleDateString();
      } catch (error) {
        return '';
      }
    }

    /** Re-render the relative labels and status freshness while the panel is open. */
    function useMinuteTick() {
      const [now, setNow] = useState(() => Date.now());
      useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30000);
        return () => window.clearInterval(timer);
      }, []);
      return now;
    }

    /** Whether an in-flight drag carries something this panel may drop. */
    function isSessionDrag(event) {
      const transfer = event.dataTransfer;
      if (!transfer || !transfer.types) return false;
      const types = Array.from(transfer.types);
      return types.indexOf(DRAG_TYPE) >= 0 || types.indexOf('text/plain') >= 0;
    }

    /**
     * Resolve a dropped session id. Rows dragged from the shipped sidebar set
     * `text/plain`, this plugin's own rows set both types; anything else, or an
     * id the session catalog does not know, is refused.
     */
    function readDragId(event, known) {
      const transfer = event.dataTransfer;
      if (!transfer) return undefined;
      let raw = '';
      try {
        raw = transfer.getData(DRAG_TYPE) || transfer.getData('text/plain') || '';
      } catch (error) {
        raw = '';
      }
      const sessionId = String(raw || '').trim();
      if (!sessionId || !known.has(sessionId)) return undefined;
      return sessionId;
    }
    // #endregion

    // #region icons
    /** Filled or outlined star; artwork only, so `currentColor` carries the theme. */
    function StarIcon({ filled, size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', {
          d: 'M12 3.7l2.62 5.31 5.86.85-4.24 4.13 1 5.84L12 17.1l-5.24 2.73 1-5.84-4.24-4.13 5.86-.85z',
          fill: filled ? 'currentColor' : 'none',
          stroke: 'currentColor',
          strokeWidth: filled ? 0 : 1.6,
          strokeLinejoin: 'round',
        }),
      );
    }

    /** Sidebar glyph: a clock with a quick-access sparkle. */
    /** Official "..." glyph (IconEllipsisOutlineRegular, 16px grid). */
    function EllipsisIcon({ size = 14 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M3 9C3.55228 9 4 8.55228 4 8C4 7.44772 3.55228 7 3 7C2.44772 7 2 7.44772 2 8C2 8.55228 2.44772 9 3 9Z',
          fill: 'currentColor',
        }),
        h('path', {
          d: 'M8 9C8.55228 9 9 8.55228 9 8C9 7.44772 8.55228 7 8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9Z',
          fill: 'currentColor',
        }),
        h('path', {
          d: 'M13 9C13.5523 9 14 8.55228 14 8C14 7.44772 13.5523 7 13 7C12.4477 7 12 7.44772 12 8C12 8.55228 12.4477 9 13 9Z',
          fill: 'currentColor',
        }),
      );
    }

    /** Official archive glyph (IconArchiveOutlineRegular, 16px grid). */
    function ArchiveIcon({ size = 14 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1,
          'aria-hidden': 'true',
        },
        h('path', {
          d: 'M13.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V4.5C1.5 5.05228 1.94772 5.5 2.5 5.5H13.5C14.0523 5.5 14.5 5.05228 14.5 4.5V3.5C14.5 2.94772 14.0523 2.5 13.5 2.5Z',
        }),
        h('path', {
          d: 'M2.5 5.5V13.5C2.5 13.7652 2.60536 14.0196 2.79289 14.2071C2.98043 14.3946 3.23478 14.5 3.5 14.5H12.5C12.7652 14.5 13.0196 14.3946 13.2071 14.2071C13.3946 14.0196 13.5 13.7652 13.5 13.5V5.5',
        }),
        h('path', { d: 'M6.5 9.5H9.5' }),
      );
    }

    /** Official outline pin glyph (IconPinOutlineRegular, 16px grid). */
    function PinOutlineIcon({ size = 14 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M9.96976 1.70572L13.1554 3.93629L10.9019 8.12317L11.5158 11.605L10.7192 12.7427L2.52767 7.00693L3.3243 5.86922L6.80612 5.25528L9.96976 1.70572Z',
          stroke: 'currentColor',
          strokeWidth: 1,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M6.05285 9.47511C6.27284 9.16094 6.70586 9.08458 7.02003 9.30457C7.3342 9.52455 7.41055 9.95757 7.19057 10.2717L3.98587 14.4708L3.21223 13.9291L6.05285 9.47511Z',
          fill: 'currentColor',
        }),
      );
    }

    /** Official pin glyph (IconPinFillRegular, 16px grid). */
    function PinIcon({ size = 14 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M9.96976 1.70572L13.1554 3.93629L10.9019 8.12317L11.5158 11.605L10.7192 12.7427L2.52767 7.00693L3.3243 5.86922L6.80612 5.25528L9.96976 1.70572Z',
          fill: 'currentColor',
          stroke: 'currentColor',
          strokeWidth: 1,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M6.05285 9.47511C6.27284 9.16094 6.70586 9.08458 7.02003 9.30457C7.3342 9.52455 7.41055 9.95757 7.19057 10.2717L3.98587 14.4708L3.21223 13.9291L6.05285 9.47511Z',
          fill: 'currentColor',
        }),
      );
    }

    /** Arrow hitting a top bar — "move to front" for a favorite row. */
    function MoveTopIcon({ size = 12 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': 'true', fill: 'none' },
        h('path', { d: 'M4.4 3.4h7.2', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
        h('path', { d: 'M8 13.2V6.6', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
        h('path', {
          d: 'M4.8 9.4 8 6.2l3.2 3.2',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function PanelIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('circle', { cx: 10.6, cy: 10.8, r: 7.1 }),
        h('path', { d: 'M10.6 6.9v3.9l2.7 1.7' }),
        h('path', {
          d: 'M18.3 14.7l.72 1.72 1.72.72-1.72.72-.72 1.72-.72-1.72-1.72-.72 1.72-.72z',
          fill: 'currentColor',
          stroke: 'none',
        }),
      );
    }
    // #endregion

    // #region grouping
    /**
     * Project the session catalog, statuses, workspaces and favorites into the
     * panel's sections. Pure and synchronous: every section is a freshly built
     * array, so React sees new rows only when one of the inputs changed.
     */
    function buildGroups(input) {
      const { ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now, viewed, pinnedIds } = input;
      const archived = new Set(archivedIds || []);
      // Only Sessions that belong to a real Workspace are listed. Ungrouped rows
      // (a CLI run in /tmp, a Workspace that is gone) stay where the shipped
      // browser keeps them; the section is a Workspace-scoped view on purpose.
      const workspacesLoaded = Array.isArray(workspaceItems);
      const whereBySession = new Map();
      const whereByPath = new Map();
      for (const workspace of workspaceItems || []) {
        const label = workspace.title || basename(workspace.path);
        if (workspace.path) whereByPath.set(workspace.path, label);
        for (const sessionId of workspace.sessionIds || []) whereBySession.set(sessionId, label);
      }

      const rows = [];
      for (const sessionId of ids || []) {
        const summary = byId ? byId[sessionId] : undefined;
        if (!summary) continue;
        if (archived.has(sessionId)) continue;
        if (summary.blank) continue;
        const status = (statuses && statuses.get(sessionId)) || {};
        const pending = status.pendingInteraction !== undefined && status.pendingInteraction !== null;
        const pendingKind = pending ? status.pendingInteraction.kind : undefined;
        const running = !pending && status.running === true;
        const unread = !pending && !running && status.completionUnread === true;
        // The dot is a property of the Session, never of the group it renders in:
        // a pending Session is yellow in Favorites and Recently active too, and an
        // unread completion stays green wherever it shows up.
        const state = pending ? 'pending' : running ? 'running' : unread ? 'unread' : 'idle';
        // Ungrouped Sessions (a one-off CLI run in /tmp, a removed Workspace) surface
        // only while they wait for an answer; everything else about them stays in
        // the shipped browser's "Ungrouped" bucket.
        if (workspacesLoaded && state !== 'pending') {
          const attached =
            whereBySession.has(sessionId) ||
            (typeof summary.cwd === 'string' && whereByPath.has(summary.cwd));
          if (!attached) continue;
        }
        const lastActive = typeof summary.updatedAt === 'number' ? summary.updatedAt : 0;
        const opened = (viewed && viewed[sessionId]) || 0;
        const justOpened = opened > 0 && now - opened <= VIEW_BOOST_MS ? opened : 0;
        rows.push({
          id: sessionId,
          title: summary.displayTitle || sessionId,
          where:
            whereBySession.get(sessionId) ||
            (summary.cwd ? whereByPath.get(summary.cwd) || basename(summary.cwd) : ''),
          updatedAt: Math.max(lastActive, justOpened),
          origin: summary.origin,
          pendingKind,
          state,
        });
      }
      rows.sort((left, right) => right.updatedAt - left.updatedAt);
      // Pinned Sessions lead every group, as they do in the shipped browser.
      const pinnedSet = new Set(pinnedIds || []);
      rows.sort((left, right) => (pinnedSet.has(right.id) ? 1 : 0) - (pinnedSet.has(left.id) ? 1 : 0));
      const rowById = new Map(rows.map((row) => [row.id, row]));

      const favoriteRows = [];
      for (const sessionId of favorites || []) {
        const row = rowById.get(sessionId);
        if (row) favoriteRows.push(row);
      }
      const topLevel = rows.filter((row) => row.origin !== 'subagent');
      const pendingRows = topLevel.filter((row) => row.state === 'pending');
      const runningRows = topLevel.filter((row) => row.state === 'running');
      const unreadRows = topLevel.filter((row) => row.state === 'unread');
      // "Recently active" is a plain time list: the newest sessions regardless of
      // whether they also sit in Favorites or a status group. The row marks a
      // favorite with a ★ so the duplicate reads as intentional.
      const recentRows = topLevel.slice(0, RECENT_LIMIT);

      const decorate = (row) => ({ ...row, time: relativeLabel(row.updatedAt, now, t) });
      return {
        all: rows.map(decorate),
        favorites: favoriteRows.map(decorate),
        pending: pendingRows.map(decorate),
        running: runningRows.map(decorate),
        unread: unreadRows.map(decorate),
        recent: recentRows.map(decorate),
        total: rows.length,
      };
    }
    // #endregion

    // #region page styles
    const PAGE_CSS = `
.drs-page{flex:1 1 auto;width:100%;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.4}
.drs-page *{box-sizing:border-box}
.drs-head{flex:none;padding:22px 28px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.drs-headRow{display:flex;gap:12px;align-items:flex-start;max-width:900px;margin:0 auto}
.drs-iconWrap{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary)}
.drs-headText{min-width:0}
.drs-title{margin:1px 0 0;font-size:18px;font-weight:600;line-height:1.35}
.drs-sub{margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--dsw-alias-label-secondary)}
.drs-body{flex:1;min-height:0;overflow:auto;padding:8px 20px 32px}
.drs-inner{max-width:900px;margin:0 auto}
.drs-loading,.drs-pageEmpty{padding:36px 12px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12.5px}
.drs-section{margin-top:12px;padding:2px;border-radius:12px;border:1px solid transparent}
.drs-secHead{display:flex;align-items:center;gap:8px;padding:6px 8px 4px}
.drs-secTitle{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.drs-count{font-size:11px;line-height:16px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.drs-dropActive{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.drs-row{display:flex;align-items:center;gap:10px;height:38px;padding:0 8px;border-radius:8px}
.drs-row:hover{background:var(--dsw-alias-bg-layer-2)}
.drs-row--selected{background:var(--dsw-alias-interactive-bg-hover)}
.drs-row--dropTarget{background:var(--dsw-alias-bg-layer-2);box-shadow:inset 0 2px 0 var(--dsw-alias-brand-primary)}
.drs-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.drs-dot--running{background:var(--dsw-alias-brand-primary);animation:drs-pulse 1.8s ease-in-out infinite}
.drs-dot--pending{background:var(--dsw-alias-state-warn-primary);animation:drs-pulse 1.4s ease-in-out infinite}
.drs-dot--unread{background:var(--dsw-alias-state-success-primary)}
@keyframes drs-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.drs-main{flex:1;min-width:0;display:flex;align-items:baseline;gap:10px;border:0;background:none;padding:2px 0;margin:0;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:6px}
.drs-main:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.drs-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drs-where{flex:none;max-width:38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.drs-time{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.drs-star{flex:none;width:22px;height:22px;display:grid;place-items:center;border:0;border-radius:5px;background:none;padding:0;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;transition:opacity .12s ease}
.drs-row:hover .drs-star,.drs-star:focus-visible{opacity:1}
.drs-star--on{opacity:1;color:var(--dsw-alias-brand-primary)}
.drs-star:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-brand-primary)}
.drs-star:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.drs-empty{margin:2px 6px 6px;padding:12px;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;font-size:12px;color:var(--dsw-alias-label-secondary);text-align:center}
`;

    /** Styles for the star button inside the shipped Session row strip. */
    const STAR_CSS = `
.drs-starBtn{width:20px;height:20px;display:grid;place-items:center;border:0;border-radius:5px;background:transparent;padding:0;color:var(--dsw-alias-label-secondary);cursor:pointer}
.drs-starBtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary)}
.drs-starBtn--on{color:var(--dsw-alias-brand-primary)}
.drs-starBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
`;
    // #endregion

    // #region panel
    /**
     * The "最近会话" panel: favorites (a drop target), then the sections that
     * need the user's attention, then plausible quick-access rows.
     */
    function RecentSessionsPage(props) {
      const { t, useSessions, useSessionStatus, useWorkspaces, useFavorites } = props;
      const { toggleFavorite, addFavorite, insertFavoriteBefore, moveFavoriteToFront, openSession } = props;

      const ids = useSessions((state) => state.ids);
      const byId = useSessions((state) => state.byId);
      const phase = useSessions((state) => state.phase);
      const statuses = useSessionStatus((snapshot) => snapshot);
      const workspaceItems = useWorkspaces((snapshot) => snapshot.items);
      const archivedIds = useWorkspaces((snapshot) => snapshot.archivedSessionIds);
      const favorites = useFavorites((list) => list);
      const pinnedIds = useWorkspaces((state) => state.pinnedSessionIds);
      const now = useMinuteTick();
      const [dropTarget, setDropTarget] = useState(null);
      const [viewed, setViewed] = useState(readViewed);
      const [pendingOpen, setPendingOpen] = useState(undefined);

      const knownIds = useMemo(() => {
        const known = new Set();
        for (const sessionId of ids || []) known.add(sessionId);
        if (byId) for (const key of Object.keys(byId)) known.add(key);
        return known;
      }, [ids, byId]);

      const favoriteSet = useMemo(() => new Set(favorites || []), [favorites]);
      const groups = useMemo(
        () => buildGroups({ ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now, viewed, pinnedIds }),
        [ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now, viewed, pinnedIds],
      );
      /** The session the main column currently shows, read from the mainView retain count. */
      const hostCurrentId = useMemo(() => {
        if (!byId) return undefined;
        for (const sessionId of Object.keys(byId)) {
          const summary = byId[sessionId];
          if (summary && summary.retainedBy && summary.retainedBy.mainView > 0) return sessionId;
        }
        return undefined;
      }, [byId]);

      /** A row opened from this section wins until the host selection catches up. */
      const openRow = (sessionId) => {
        setPendingOpen(sessionId);
        setViewed((previous) => {
          const next = { ...previous, [sessionId]: Date.now() };
          writeViewed(next);
          return next;
        });
        openSession(sessionId);
      };
      useEffect(() => {
        if (pendingOpen === undefined) return;
        if (hostCurrentId === pendingOpen) setPendingOpen(undefined);
      }, [hostCurrentId, pendingOpen]);
      useEffect(() => {
        if (hostCurrentId === undefined) return;
        setViewed((previous) => {
          if (previous[hostCurrentId] !== undefined) return previous;
          const next = { ...previous, [hostCurrentId]: Date.now() };
          writeViewed(next);
          return next;
        });
      }, [hostCurrentId]);
      const currentId = pendingOpen !== undefined ? pendingOpen : hostCurrentId;

      const dragPropsOf = (row) => ({
        draggable: true,
        onDragStart: (event) => {
          const transfer = event.dataTransfer;
          if (!transfer) return;
          try {
            transfer.effectAllowed = 'copyMove';
            transfer.setData(DRAG_TYPE, row.id);
            transfer.setData('text/plain', row.id);
          } catch (error) {
            /* some platforms refuse custom types; text/plain still carries the id */
          }
        },
      });

      const favoriteDropPropsOf = (row) => ({
        onDragOver: (event) => {
          if (!isSessionDrag(event)) return;
          event.preventDefault();
          event.stopPropagation();
          // The shipped Session rows declare `effectAllowed = 'move'`, so a
          // 'copy' drop effect would be refused by the source; 'move' is legal
          // for both those rows and this panel's own 'copyMove' rows.
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          setDropTarget((current) => (current === row.id ? current : row.id));
        },
        onDragLeave: (event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          setDropTarget((current) => (current === row.id ? null : current));
        },
        onDrop: (event) => {
          const sessionId = readDragId(event, knownIds);
          setDropTarget(null);
          if (sessionId === undefined) return;
          event.preventDefault();
          event.stopPropagation();
          insertFavoriteBefore(sessionId, row.id);
        },
      });

      const renderRow = (row, options) => {
        const favorite = favoriteSet.has(row.id);
        const selected = row.id === currentId;
        const label = t(favorite ? 'action.unfavorite' : 'action.favorite');
        return h(
          'div',
          {
            key: row.id,
            className:
              'drs-row' +
              (selected ? ' drs-row--selected' : '') +
              (dropTarget === row.id ? ' drs-row--dropTarget' : ''),
            'aria-selected': selected ? 'true' : 'false',
            ...dragPropsOf(row),
            ...(options && options.drop ? favoriteDropPropsOf(row) : {}),
          },
          h('span', {
            className: 'drs-dot drs-dot--' + row.state,
            title: t('dot.' + row.state),
            'aria-hidden': 'true',
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'drs-main',
              title: row.title,
              'aria-label': t('action.open') + ': ' + row.title,
              onClick: () => openRow(row.id),
            },
            h('span', { className: 'drs-name' }, row.title),
            row.where ? h('span', { className: 'drs-where' }, row.where) : null,
          ),
          h('span', { className: 'drs-time' }, row.time),
          favorite
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'drs-pinTop',
                  'aria-label': t('action.moveToTop'),
                  title: t('action.moveToTop'),
                  onClick: (event) => {
                    event.stopPropagation();
                    moveFavoriteToFront(row.id);
                  },
                },
                h(MoveTopIcon, { size: 13 }),
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'drs-star' + (favorite ? ' drs-star--on' : ''),
              'aria-pressed': favorite ? 'true' : 'false',
              'aria-label': label,
              title: label,
              onClick: (event) => {
                event.stopPropagation();
                toggleFavorite(row.id);
              },
            },
            h(StarIcon, { filled: favorite, size: 14 }),
          ),
        );
      };

      const renderSection = (key, titleKey, rows) => {
        if (rows.length === 0) return null;
        return h(
          'section',
          { key, className: 'drs-section' },
          h(
            'div',
            { className: 'drs-secHead' },
            h('span', { className: 'drs-secTitle' }, t(titleKey)),
            h('span', { className: 'drs-count' }, String(rows.length)),
          ),
          rows.map((row) => renderRow(row)),
        );
      };

      const favoritesSection = h(
        'section',
        {
          key: 'favorites',
          className: 'drs-section' + (dropTarget === 'section' ? ' drs-dropActive' : ''),
          'aria-label': t('section.favorites'),
          onDragOver: (event) => {
            if (!isSessionDrag(event)) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            setDropTarget((current) => (current === 'section' ? current : 'section'));
          },
          onDragLeave: (event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            setDropTarget((current) => (current === 'section' ? null : current));
          },
          onDrop: (event) => {
            const sessionId = readDragId(event, knownIds);
            setDropTarget(null);
            if (sessionId === undefined) return;
            event.preventDefault();
            addFavorite(sessionId);
          },
        },
        h(
          'div',
          { className: 'drs-secHead' },
          h('span', { className: 'drs-secTitle' }, t('section.favorites')),
          groups.favorites.length > 0
            ? h('span', { className: 'drs-count' }, String(groups.favorites.length))
            : null,
        ),
        groups.favorites.length === 0
          ? h('div', { className: 'drs-empty' }, t(dropTarget === 'section' ? 'hint.drop' : 'empty.favorites'))
          : groups.favorites.map((row) => renderRow(row, { drop: true })),
      );

      let body;
      if (groups.total === 0) {
        body = h(
          'div',
          { className: phase === 'ready' ? 'drs-pageEmpty' : 'drs-loading' },
          t(phase === 'ready' ? 'page.empty' : 'page.loading'),
        );
      } else {
        body = [
          favoritesSection,
          renderSection('pending', 'section.pending', groups.pending),
          renderSection('running', 'section.running', groups.running),
          renderSection('unread', 'section.unread', groups.unread),
          renderSection('recent', 'section.recent', groups.recent),
        ];
      }

      return h(
        'div',
        { className: 'drs-page' },
        h('style', { key: 'drs-page-css' }, PAGE_CSS),
        h(
          'header',
          { className: 'drs-head' },
          h(
            'div',
            { className: 'drs-headRow' },
            h('span', { className: 'drs-iconWrap' }, h(PanelIcon, { size: 20 })),
            h(
              'div',
              { className: 'drs-headText' },
              h('h1', { className: 'drs-title' }, t('page.title')),
              h('p', { className: 'drs-sub' }, t('page.subtitle')),
            ),
          ),
        ),
        h('div', { className: 'drs-body' }, h('div', { className: 'drs-inner' }, body)),
      );
    }
    // #endregion

    // #region row button
    /**
     * The star hover button of every shipped Session row: one click toggles
     * membership in the same favorite list the panel renders.
     */
    function FavoriteRowButton(props) {
      const { sessionId, useFavorites, toggleFavorite, t } = props;
      const favorite = useFavorites((list) => list.indexOf(sessionId) >= 0);
      const label = t(favorite ? 'action.unfavorite' : 'action.favorite');
      return h(
        React.Fragment,
        null,
        h('style', { key: 'drs-star-css' }, STAR_CSS),
        h(
          'button',
          {
            key: 'drs-star',
            type: 'button',
            className: 'drs-starBtn' + (favorite ? ' drs-starBtn--on' : ''),
            'aria-label': label,
            'aria-pressed': favorite ? 'true' : 'false',
            title: label,
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite(sessionId);
            },
          },
          h(StarIcon, { filled: favorite, size: 14 }),
        ),
      );
    }
    // #endregion

    // #region sidebar shell
    /**
     * Categories that start expanded. The shipped browser expands every group;
     * this block mirrors that for the categories that hold something to act on
     * and keeps the informational ones folded so the sidebar list stays short.
     */
    const INLINE_START_COLLAPSED = { favorites: false, pending: false, unread: false, running: true, recent: true };
    /** Persisted "collapsed to one line" state of the whole section. */
    const INLINE_OPEN_KEY = 'dsh.recent-sessions.inline.open.v1';
    /** Persisted per-category fold overrides (the user's explicit choices). */
    const INLINE_CATS_KEY = 'dsh.recent-sessions.cats.v1';
    /** Categories whose fold state may be remembered. */
    const INLINE_CATEGORY_KEYS = ['favorites', 'pending', 'running', 'unread', 'recent'];
    /** Collapse transition length, matching the shipped sidebar shell. */
    const SHELL_COLLAPSE_MS = 300;

    /** Panel launchers hidden from the panel list; in memory, like the shipped shell. */
    function createPanelPins() {
      let unpinned = [];
      let snapshot = unpinned;
      const listeners = new Set();
      const publish = () => {
        snapshot = unpinned.slice();
        for (const listener of [...listeners]) {
          try {
            listener();
          } catch (error) {
            console.error('recent-sessions: pin listener failed', error);
          }
        }
      };
      return {
        unpinned: {
          getSnapshot: () => snapshot,
          subscribe: (listener) => {
            listeners.add(listener);
            return () => {
              listeners.delete(listener);
            };
          },
        },
        setPinned: (id, pinned) => {
          if (id === 'plugins') return;
          const hidden = unpinned.indexOf(id) >= 0;
          if (pinned === !hidden) return;
          unpinned = pinned ? unpinned.filter((value) => value !== id) : unpinned.concat([id]);
          publish();
        },
      };
    }

    /** Resolve one registration `label` option. */
    function resolveLabel(label, id) {
      if (typeof label === 'function') {
        try {
          return label();
        } catch (error) {
          return id;
        }
      }
      return label === undefined || label === null ? id : String(label);
    }

    /** Projection of the `sidebar.panellist` ledger into panel metadata. */
    function createPanelsSource(ctx) {
      let snapshot = [];
      const listeners = new Set();
      const sync = () => {
        const next = ctx.slots
          .entriesOfSlot('sidebar.panellist')
          .map(({ options }) => ({
            id: options.id,
            order: options.order === undefined ? 0 : options.order,
            label: resolveLabel(options.label, options.id),
          }))
          .sort((left, right) => left.order - right.order);
        const current = snapshot;
        if (
          current.length === next.length &&
          current.every(
            (panel, index) =>
              panel.id === next[index].id &&
              panel.order === next[index].order &&
              panel.label === next[index].label,
          )
        ) {
          return;
        }
        snapshot = next;
        for (const listener of [...listeners]) {
          try {
            listener();
          } catch (error) {
            console.error('recent-sessions: panel listener failed', error);
          }
        }
      };
      const disposers = [ctx.slots.subscribe('sidebar.panellist', sync), ctx.locale.subscribe(sync)];
      sync();
      return {
        source: {
          getSnapshot: () => snapshot,
          subscribe: (listener) => {
            listeners.add(listener);
            return () => {
              listeners.delete(listener);
            };
          },
        },
        dispose: () => {
          for (const dispose of disposers) {
            try {
              dispose();
            } catch (error) {
              /* already disposed */
            }
          }
        },
      };
    }

    /** Whether the panel list's More menu has registered rows. */
    function createEntryActionsSource(ctx) {
      return {
        getSnapshot: () => ctx.slots.entriesOfSlot('sidebar.panellist.actions').length > 0,
        subscribe: (listener) => ctx.slots.subscribe('sidebar.panellist.actions', listener),
      };
    }

    /** Contain one risky subtree so a failure there cannot take the whole sidebar down. */
    class Guard extends React.Component {
      constructor(props) {
        super(props);
        this.state = { failed: false };
      }
      static getDerivedStateFromError() {
        return { failed: true };
      }
      componentDidCatch(error) {
        console.error('recent-sessions: guarded subtree failed', error);
      }
      render() {
        if (this.state.failed) return this.props.fallback === undefined ? null : this.props.fallback;
        return this.props.children;
      }
    }

    /** "Collapse all categories" glyph; points outward once everything is folded. */
    function CollapseAllIcon({ size, collapsed }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          className: collapsed ? 'drs-arrow drs-flip' : 'drs-arrow',
          style: { display: 'block' },
        },
        h('path', { d: 'M7.5 10.2l4.5-4.5 4.5 4.5' }),
        h('path', { d: 'M7.5 13.8l4.5 4.5 4.5-4.5' }),
      );
    }

    /** "Open in the panel" glyph. */
    function OpenPanelIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', { d: 'M13.4 4.4h6.2v6.2' }),
        h('path', { d: 'M19.2 4.8l-7.6 7.6' }),
        h('path', { d: 'M17.4 13.6v4.4a2 2 0 0 1-2 2H6.4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4.4' }),
      );
    }

    /** Disclosure chevron. */
    function ChevronIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', { d: 'M9.5 5.5l7 6.5-7 6.5' }),
      );
    }

    /** Sidebar collapse/expand glyph. */
    function PanelLeftIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('rect', { x: 3.2, y: 4.4, width: 17.6, height: 15.2, rx: 3 }),
        h('path', { d: 'M9.6 4.8v14.4' }),
      );
    }

    /** New-session glyph: a speech bubble with a plus. */
    function NewChatIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', { d: 'M4.4 6.6a2.2 2.2 0 0 1 2.2-2.2h10.8a2.2 2.2 0 0 1 2.2 2.2v7.2a2.2 2.2 0 0 1-2.2 2.2H10l-4.4 3.1v-3.1h-.2a2.2 2.2 0 0 1-1-1.8z' }),
        h('path', { d: 'M12 7.6v5.6M9.2 10.4h5.6' }),
      );
    }

    /** Apps/More glyph. */
    function AppsAddIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('rect', { x: 3.8, y: 3.8, width: 6.2, height: 6.2, rx: 1.6 }),
        h('rect', { x: 14, y: 3.8, width: 6.2, height: 6.2, rx: 1.6 }),
        h('rect', { x: 3.8, y: 14, width: 6.2, height: 6.2, rx: 1.6 }),
        h('path', { d: 'M17.1 13.6v6.2M14 16.7h6.2' }),
      );
    }

    /** Filled disclosure triangle, matching the shipped group rows. */
    function TriangleIcon({ size, open }) {
      return h(
        'svg',
        {
          viewBox: '0 0 12 12',
          width: size,
          height: size,
          'aria-hidden': 'true',
          focusable: 'false',
          className: 'drs-arrow' + (open ? ' drs-arrow--open' : ''),
          style: { display: 'block' },
        },
        h('path', { d: 'M4 2.4l5 3.6-5 3.6z', fill: 'currentColor' }),
      );
    }

    /** Category glyph: something is waiting for you. */
    function WarnIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', { d: 'M12 3.9l8.6 15.2H3.4z' }),
        h('path', { d: 'M12 9.3v4.2' }),
        h('path', { d: 'M12 16.4v.1' }),
      );
    }

    /** Search glyph. */
    function SearchIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('circle', { cx: 10.8, cy: 10.8, r: 6.6 }),
        h('path', { d: 'M15.7 15.7L20 20' }),
      );
    }

    /** Small close glyph. */
    function CloseIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', { d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' }),
      );
    }

    /** Category glyph: running. */
    function PlayIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('circle', { cx: 12, cy: 12, r: 8.4 }),
        h('path', { d: 'M10.3 8.9l5 3.1-5 3.1z', fill: 'currentColor', stroke: 'none' }),
      );
    }

    /** Category glyph: finished, not viewed yet. */
    function CheckCircleIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('circle', { cx: 12, cy: 12, r: 8.4 }),
        h('path', { d: 'M8.2 12.3l2.6 2.5 5-5.1' }),
      );
    }

    /** Category glyph: recently active. */
    function ClockIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('circle', { cx: 12, cy: 12, r: 8.4 }),
        h('path', { d: 'M12 7.3v5l3.2 1.9' }),
      );
    }

    /** Fallback brand mark, used only while `sidebar.brand.mark` has no occupant. */
    function BrandMarkFallback({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('circle', { cx: 12, cy: 12, r: 9.2, fill: 'var(--dsw-alias-brand-primary)' }),
        h('path', { d: 'M7.6 13.4c2-3.4 3.6-3.4 4.6-1.2s2.6 2.2 4.2-1.4', fill: 'none', stroke: '#FFFFFF', strokeWidth: 1.8, strokeLinecap: 'round' }),
      );
    }

    const SHELL_CSS = `
.drs-shell{--drs-sidebar-inline-padding:12px;--dsh-sidebar-inline-padding:12px;box-sizing:border-box;height:100%;display:flex;flex-direction:column;padding:6px var(--drs-sidebar-inline-padding);background:var(--dsw-specific-sidebar-fill);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.4;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}
html[data-platform="darwin"] .drs-shell{background:transparent}
.drs-shell--collapsed{padding:18px 10px 6px}
.drs-logoRow{box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:flex-end;gap:8px;height:60px;margin-bottom:4px;padding:8px 0 8px 4px;overflow:hidden}
.drs-shell--collapsed .drs-logoRow{justify-content:flex-start;height:36px;margin-bottom:12px;padding:0;overflow:visible}
.drs-brand{min-width:0;flex:1;display:inline-flex;align-items:center;padding:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer;overflow:hidden}
.drs-brandIdentity{display:inline-flex;align-items:center;gap:8px;min-width:0;height:24px}
.drs-brandMark{display:inline-flex;flex:none;align-items:center;justify-content:center}
.drs-brandName{display:inline-flex;align-items:center;gap:6px;min-width:0;height:24px;font-size:18px;font-weight:600;letter-spacing:.04em;line-height:24px}
.drs-fallbackBrandName{font-size:17px;font-weight:600;white-space:nowrap;letter-spacing:0}
.drs-iconButton{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:6px;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer}
.drs-iconButton:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-iconButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.drs-shell--collapsed .drs-iconButton{width:36px;height:36px;border-radius:8px;color:var(--dsw-alias-label-primary)}
.drs-railMark{display:inline-flex;align-items:center;justify-content:center}
.drs-panelIcon{display:inline-flex;align-items:center;justify-content:center}
.drs-shell--collapsed .drs-panelIcon{display:none}
.drs-shell--collapsed .drs-iconButton:hover .drs-panelIcon{display:inline-flex}
.drs-shell--collapsed .drs-iconButton:hover .drs-railMark{display:none}
.drs-newSession{box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:center;height:38px;margin:0 2px 12px;padding:8px 12px;border:.5px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;font-weight:500;line-height:22px;cursor:pointer;overflow:hidden}
.drs-newSession:hover{background:var(--dsw-alias-button-floating-hover)}
.drs-shell--collapsed .drs-newSession{width:36px;height:36px;align-self:flex-start;margin:0 0 12px;padding:0;background:none;border-color:transparent}
.drs-shell--collapsed .drs-newSession:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-newSessionLabelMask{flex:1;min-width:0;display:flex;align-items:center;justify-content:center}
.drs-newSessionContent{display:flex;align-items:center;justify-content:center;gap:6px;width:100%}
.drs-newSessionContent>svg{flex:none}
.drs-newSessionLabel{white-space:nowrap;overflow:hidden;max-width:200px}
.drs-panelList{flex:none;display:flex;flex-direction:column;gap:2px;margin-bottom:8px}
.drs-panelRow{box-sizing:border-box;display:flex;align-items:center;gap:8px;min-height:36px;margin:0 2px;padding:7px 8px;border:0;border-radius:8px;background:none;color:var(--dsw-alias-label-primary);font:inherit;line-height:22px;text-align:left;cursor:pointer}
.drs-panelRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-panelRow--active{background:var(--dsw-alias-interactive-bg-hover)}
.drs-panelRow:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.drs-panelGlyph{flex:none;display:inline-flex;align-items:center;justify-content:center}
.drs-panelTitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drs-shell--collapsed .drs-panelList{gap:12px;margin-bottom:12px}
.drs-shell--collapsed .drs-panelRow{width:36px;height:36px;justify-content:center;margin:0;padding:0;color:var(--dsw-alias-label-primary)}
.drs-moreWrap{position:relative;display:flex;flex-direction:column}
.drs-moreMenu{position:absolute;z-index:40;top:calc(100% + 4px);left:0;width:288px;max-width:calc(100vw - 24px);padding:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 32px rgba(0,0,0,.18)}
.drs-browserSlot{flex:1 1 0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.drs-regionArea{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;margin-left:-4px;margin-right:calc(-1 * var(--drs-sidebar-inline-padding));padding-left:4px}
.drs-shell--collapsed .drs-regionArea{margin:0;padding-left:0}
.drs-footArea{flex:none;display:flex;flex-direction:column}
.drs-settingsArea,.drs-footerActions{flex:none;width:100%;min-width:0}
.drs-footerActions{display:flex}
.drs-shell--collapsed .drs-footArea{align-items:center}
.drs-shell--collapsed .drs-settingsArea,.drs-shell--collapsed .drs-footerActions{display:flex;justify-content:center;width:auto}
.drs-fading>*{opacity:0;transition:opacity .15s ease-in-out}
.drs-railIn .drs-iconButton,.drs-railIn .drs-newSession,.drs-railIn .drs-panelList,.drs-railIn .drs-regionArea{animation:drs-rail-in .15s ease-in-out backwards}
@keyframes drs-rail-in{0%{opacity:0;transform:translate(49px)}}
.drs-inline{flex:none;display:flex;flex-direction:column;padding:0 12px 4px 0;margin-bottom:4px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.drs-sectionHeader{box-sizing:border-box;flex:none;display:flex;align-items:center;gap:4px;height:36px;margin:2px -4px 4px 0;padding-left:4px;color:var(--dsw-alias-label-tertiary);overflow:hidden}
.drs-sectionToggle{flex:0 0 auto;min-width:0;display:flex;align-items:center;gap:6px;height:100%;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:6px}
.drs-sectionToggle:hover .drs-sectionLabel{color:var(--dsw-alias-label-secondary)}
.drs-sectionToggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.drs-sectionLabel{flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;line-height:20px}
.drs-sectionCount{flex:none;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.drs-searchInput{flex:1;min-width:0;height:28px;padding:0 6px;border:.5px solid var(--dsw-alias-border-l4);border-radius:6px;background:none;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:18px;outline:none}
.drs-searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}
.drs-searchInput:focus-visible{border-color:var(--dsw-alias-brand-primary)}
.drs-projectHint{flex:none;max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:6px;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.drs-sectionSpacer{flex:1;min-width:4px}
.drs-headerActions{flex:none;display:flex;align-items:center;gap:4px}
.drs-headerBtn{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:6px;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer}
.drs-headerBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-headerBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.drs-groups{display:flex;flex-direction:column;max-height:min(38vh,420px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dsh-scrollbar-thumb,rgba(128,138,150,.45)) transparent;padding-right:2px}
.drs-groups::-webkit-scrollbar{width:5px}
.drs-groups::-webkit-scrollbar-track{background:transparent}
.drs-groups::-webkit-scrollbar-thumb{background:var(--dsh-scrollbar-thumb,rgba(128,138,150,.45));border-radius:999px}
.drs-groups::-webkit-scrollbar-thumb:hover{background:var(--dsh-scrollbar-thumb-hover,rgba(128,138,150,.7))}
.drs-groups.drs-edge-top{mask-image:linear-gradient(180deg,transparent 0,#000 16px)}
.drs-groups.drs-edge-bottom{mask-image:linear-gradient(0deg,transparent 0,#000 22px)}
.drs-groups.drs-edge-top.drs-edge-bottom{mask-image:linear-gradient(180deg,transparent 0,#000 16px calc(100% - 22px),transparent 100%)}
.drs-mark{background:none;color:var(--dsw-alias-brand-primary);font-weight:600;padding:0}
.drs-row--dropBefore{box-shadow:inset 0 2px 0 color-mix(in srgb,var(--dsw-alias-brand-primary) 78%,transparent)}
.drs-rowWhere{flex:none;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-left:2px;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.drs-rowNote{flex:none;font-size:10px;line-height:16px;color:var(--dsw-alias-state-warn-primary);white-space:nowrap}

.drs-rowPinIcon{flex:none;display:inline-flex;align-items:center;margin-left:4px;color:var(--dsw-alias-label-tertiary)}
.drs-rowBtn{flex:none;display:none;place-items:center;width:18px;height:18px;padding:0;border:0;border-radius:4px;background:none;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.drs-row:hover .drs-rowBtn,.drs-row:focus-within .drs-rowBtn{display:grid}
.drs-rowBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.drs-rowBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.drs-rowBtn--on{color:var(--dsw-alias-brand-primary)}
.drs-menu{position:fixed;z-index:1000;min-width:184px;padding:4px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);box-shadow:0 10px 28px rgba(0,0,0,.28)}
.drs-menuItem{display:flex;align-items:center;width:100%;height:30px;padding:0 10px;border:0;border-radius:6px;background:none;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:18px;text-align:left;cursor:pointer}
.drs-menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-menuSep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}
.drs-group{position:relative;display:flex;flex-direction:column}
.drs-group>*+*{margin-top:2px}
.drs-group+.drs-group{margin-top:4px}
.drs-group{transition:background-color .12s ease}
.drs-group--drop{background:var(--dsw-alias-interactive-bg-hover);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);border-radius:8px}
.drs-groups--search .drs-row + .drs-row{margin-top:2px}
.drs-searchMore{padding:8px 6px 4px calc(28px + var(--dsh-workspace-indent-level-1,0px));font:400 11px/16px var(--dsw-font-sans);color:var(--dsw-alias-label-tertiary)}
.drs-projectRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;height:34px;padding:0 8px;border-radius:8px;color:var(--dsw-alias-label-primary);cursor:pointer;user-select:none}
.drs-projectRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-projectRow:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.drs-glyphSlot{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;color:var(--dsw-alias-label-tertiary)}
.drs-chevron{display:none;color:var(--dsw-alias-label-caption)}
.drs-projectRow:hover .drs-chevron{display:inline-flex}
.drs-projectRow:hover .drs-folder{display:none}
.drs-arrow{transition:transform .15s var(--ds-ease-in-out)}
.drs-arrow--open{transform:rotate(90deg)}
.drs-flip{transform:rotate(180deg)}
.drs-projectTitle{flex:1;min-width:0;margin:0 6px 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}
.drs-projectCount{flex:none;margin-right:6px;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.drs-row{box-sizing:border-box;display:flex;align-items:center;height:32px;padding:0 8px 0 20px;border-radius:8px;color:var(--dsw-alias-label-primary);cursor:pointer;user-select:none}
.drs-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-row--selected{background:var(--dsw-alias-interactive-bg-hover)}
.drs-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.drs-rowSlot{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px}
.drs-rowTitle{flex:1;min-width:0;margin:0 6px 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}
.drs-rowTime{flex:none;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.drs-rowStar{flex:none;display:none;place-items:center;width:16px;height:16px;padding:0;border:0;border-radius:4px;background:none;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.drs-row:hover .drs-rowTime,.drs-row:hover .drs-rowNote{display:none}
.drs-row:hover .drs-rowStar,.drs-rowStar--on{display:grid}
.drs-rowTop{flex:none;display:none;place-items:center;width:16px;height:16px;padding:0;border:0;border-radius:4px;background:none;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.drs-row:hover .drs-rowTop,.drs-row:focus-within .drs-rowTop{display:grid}
.drs-rowTop:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.drs-pinTop{flex:none;display:none;place-items:center;width:22px;height:22px;padding:0;border:0;border-radius:5px;background:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0;transition:opacity .12s ease}
.drs-row:hover .drs-pinTop,.drs-row:focus-within .drs-pinTop{display:grid;opacity:1}
.drs-pinTop:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.drs-rowStar--on{color:var(--dsw-alias-brand-primary)}
.drs-overflow{box-sizing:border-box;width:100%;height:28px;padding:0 12px 0 40px;border:0;border-radius:6px;background:none;color:var(--dsw-alias-label-tertiary);font-size:12px;text-align:left;cursor:pointer;font-family:inherit}
.drs-overflow:hover{color:var(--dsw-alias-label-secondary)}
.drs-inlineEmpty{padding:2px 12px 2px 40px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.drs-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.drs-dot--running{background:var(--dsw-alias-brand-primary);animation:drs-inline-pulse 1.8s ease-in-out infinite}
.drs-dot--pending{background:var(--dsw-alias-state-warn-primary);animation:drs-inline-pulse 1.4s ease-in-out infinite}
.drs-dot--unread{background:var(--dsw-alias-state-success-primary)}
@keyframes drs-inline-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.drs-leading{display:flex;align-items:center;gap:8px}
.drs-leadingBtn{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:6px;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer}
.drs-leadingBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-fallback{display:flex;flex-direction:column;min-height:0;height:100%}
.drs-fallbackNotice{display:flex;align-items:center;gap:8px;justify-content:space-between;margin:6px 10px 8px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);font:400 12px/16px var(--dsw-font-sans);color:var(--dsw-alias-label-secondary)}
.drs-fallbackBtn{flex:none;padding:2px 8px;border:1px solid var(--dsw-alias-border-secondary);border-radius:6px;background:none;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}
.drs-fallbackBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
`;

    /** Persisted open state of the inline section. */
    function readInlineOpen() {
      try {
        return window.localStorage.getItem(INLINE_OPEN_KEY) !== '0';
      } catch (error) {
        return true;
      }
    }

    /** Read the per-category fold overrides; unknown keys and non-booleans are dropped. */
    function readCategoryOverrides() {
      try {
        const raw = window.localStorage.getItem(INLINE_CATS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const overrides = {};
        for (const key of INLINE_CATEGORY_KEYS) {
          const value = parsed[key];
          if (typeof value === 'boolean') overrides[key] = value;
        }
        return overrides;
      } catch (error) {
        return {};
      }
    }

    /** Remember one category's fold choice. */
    function writeCategoryOverrides(overrides) {
      try {
        window.localStorage.setItem(INLINE_CATS_KEY, JSON.stringify(overrides));
      } catch (error) {
        /* storage may be unavailable; the in-memory state still works */
      }
    }

    /** Persisted scroll offset of the inline list, so a reload lands where it left off. */
    function readInlineScroll() {
      try {
        const value = Number(window.localStorage.getItem('dsh.recent-sessions.scroll.v1'));
        return Number.isFinite(value) && value > 0 ? value : 0;
      } catch (error) {
        return 0;
      }
    }

    /** Remember the inline list's scroll offset. */
    function writeInlineScroll(value) {
      try {
        window.localStorage.setItem('dsh.recent-sessions.scroll.v1', String(Math.max(0, Math.round(value))));
      } catch (error) {
        /* storage may be unavailable; the in-memory state still works */
      }
    }

    /** Session ids pinned from this section, newest first (its own pin scope). */
    function readLocalPins() {
      try {
        const raw = window.localStorage.getItem('dsh.recent-sessions.pinned.v1');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
      } catch (error) {
        return [];
      }
    }

    /** Remember this section's pin order. */
    function writeLocalPins(ids) {
      try {
        window.localStorage.setItem('dsh.recent-sessions.pinned.v1', JSON.stringify(ids));
      } catch (error) {
        /* storage may be unavailable; the in-memory state still works */
      }
    }

    /** Session ids this browser opened, with the timestamp of the last open. */
    function readViewed() {
      try {
        const raw = window.localStorage.getItem('dsh.recent-sessions.viewed.v1');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const map = {};
        for (const key of Object.keys(parsed)) {
          const value = parsed[key];
          if (typeof value === 'number' && Number.isFinite(value)) map[key] = value;
        }
        return map;
      } catch (error) {
        return {};
      }
    }

    /** Remember that a session was just opened. */
    function writeViewed(map) {
      try {
        window.localStorage.setItem('dsh.recent-sessions.viewed.v1', JSON.stringify(map));
      } catch (error) {
        /* storage may be unavailable; the in-memory state still works */
      }
    }

    /** Remember the inline section's disclosure state. */
    function writeInlineOpen(open) {
      try {
        window.localStorage.setItem(INLINE_OPEN_KEY, open ? '1' : '0');
      } catch (error) {
        /* storage may be unavailable; the in-memory state still works */
      }
    }

    /**
     * Last-resort sidebar: this plugin owns the `sidebar` slot, so a crash in
     * any child would otherwise leave the column with no occupant at all.
     * Keep the built-in session list reachable instead.
     */
    function SidebarFallback(props) {
      const { t, renderSlot, toggleSidebar, collapsed } = props;
      return h(
        'div',
        { className: 'drs-fallback' },
        h(
          'div',
          { className: 'drs-fallbackNotice' },
          h('span', null, t('inline.crashed')),
          h(
            'button',
            {
              type: 'button',
              className: 'drs-fallbackBtn',
              onClick: () => {
                window.location.reload();
              },
            },
            t('inline.reload'),
          ),
        ),
        h(
          Guard,
          { fallback: null },
          renderSlot('sidebar.workspaces', {
            wide: true,
            expandSidebar: () => {
              if (collapsed) toggleSidebar();
            },
          }),
        ),
      );
    }

    /** One row's "..." menu: the actions the shipped strip offers, plus this plugin's. */
    function RowMenu(props) {
      const { t, menu, favorite, pinned, onClose, onFavorite, onMoveToTop, onPin, onUnpin, onArchive } = props;
      const ref = React.useRef(null);
      useEffect(() => {
        const onPointerDown = (event) => {
          if (ref.current && ref.current.contains(event.target)) return;
          onClose();
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') onClose();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown, true);
        };
      }, [onClose]);
      const item = (key, label, run) =>
        h(
          'button',
          {
            key,
            type: 'button',
            role: 'menuitem',
            className: 'drs-menuItem',
            onClick: () => {
              run();
              onClose();
            },
          },
          label,
        );
      return h(
        'div',
        {
          ref,
          className: 'drs-menu',
          role: 'menu',
          style: { top: menu.top + 'px', left: menu.left + 'px' },
        },
        item('pin', t(pinned ? 'action.unpin' : 'action.pin'), pinned ? onUnpin : onPin),
        item('fav', t(favorite ? 'action.unfavorite' : 'action.favorite'), onFavorite),
        favorite ? item('top', t('action.moveToTop'), onMoveToTop) : null,
        h('div', { key: 'sep', className: 'drs-menuSep', role: 'separator' }),
        item('archive', t('action.archive'), onArchive),
        item('copy', t('action.copyId'), () => {
          try {
            void navigator.clipboard.writeText(menu.id);
          } catch (error) {
            /* clipboard permission denied; nothing to do */
          }
        }),
      );
    }

    /**
     * The sidebar's inline "最近会话" section.
     *
     * Mirrors the shipped browsing region layer for layer (36px section header,
     * 34px project rows, 32px session rows, 28px overflow row, 2px/4px rhythm) and
     * adds the behaviour this section needs on its own: a bounded scroll area
     * with edge fades, arrow-key navigation, in-place search with match
     * highlighting, drag-to-reorder inside Favorites, and a data-driven default
     * fold that the user's own choices override.
     */
    function RecentInlineGroup(props) {
      const { t, selectPanel, openSession, toggleFavorite, addFavorite, insertFavoriteBefore, moveFavoriteToFront, maxHeight } = props;
      const { useSessions, useSessionStatus, useWorkspaces, useFavorites } = props;
      const ids = useSessions((state) => state.ids);
      const byId = useSessions((state) => state.byId);
      const statuses = useSessionStatus((snapshot) => snapshot);
      const workspaces = useWorkspaces((snapshot) => snapshot);
      const favorites = useFavorites((list) => list);
      const now = useMinuteTick();
      const [open, setOpen] = useState(readInlineOpen);
      const [overrides, setOverrides] = useState(readCategoryOverrides);
      const [expanded, setExpanded] = useState({});
      const [dropZone, setDropZone] = useState(null);
      const SEARCH_LIMIT = 8;
      const [dropBefore, setDropBefore] = useState(null);
      const [searching, setSearching] = useState(false);
      const [query, setQuery] = useState('');
      const [edges, setEdges] = useState({ top: false, bottom: false });
      const [viewed, setViewed] = useState(readViewed);
      const [pendingOpen, setPendingOpen] = useState(undefined);
      const [dragFold, setDragFold] = useState(false);
      const [rowMenu, setRowMenu] = useState(null);
      const [localPins, setLocalPins] = useState(readLocalPins);
      const searchRef = React.useRef(null);
      const listRef = React.useRef(null);
      const savedScroll = React.useRef(readInlineScroll());
      const scrollWriteAt = React.useRef(0);
      const sectionRef = React.useRef(null);

      const pinnedIds = useWorkspaces((state) => state.pinnedSessionIds);
      /** This section's pin scope first, then whatever the shipped browser also pins. */
      const mergedPins = useMemo(() => {
        const seen = new Set();
        const merged = [];
        for (const id of localPins) {
          if (!seen.has(id)) {
            seen.add(id);
            merged.push(id);
          }
        }
        for (const id of pinnedIds || []) {
          if (!seen.has(id)) {
            seen.add(id);
            merged.push(id);
          }
        }
        return merged;
      }, [localPins, pinnedIds]);
      const pinnedSet = useMemo(() => new Set(mergedPins), [mergedPins]);
      /** Flip this section's own pin and mirror it to the shipped browser's pin list. */
      const togglePin = (sessionId) => {
        const wasPinned = localPins.indexOf(sessionId) >= 0;
        const next = wasPinned ? localPins.filter((value) => value !== sessionId) : [sessionId].concat(localPins);
        setLocalPins(next);
        writeLocalPins(next);
        if (wasPinned) unpinSession(sessionId);
        else pinSession(sessionId);
      };

      const workspaceItems = workspaces ? workspaces.items : undefined;
      const archivedIds = workspaces ? workspaces.archivedSessionIds : undefined;
      const groups = useMemo(
        () => buildGroups({ ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now, viewed, pinnedIds: mergedPins }),
        [ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now, viewed, mergedPins],
      );
      /** The session the main column currently shows, read from the mainView retain count. */
      const hostCurrentId = useMemo(() => {
        if (!byId) return undefined;
        for (const sessionId of Object.keys(byId)) {
          const summary = byId[sessionId];
          if (summary && summary.retainedBy && summary.retainedBy.mainView > 0) return sessionId;
        }
        return undefined;
      }, [byId]);

      /** A row opened from this section wins until the host selection catches up. */
      const openRow = (sessionId) => {
        setPendingOpen(sessionId);
        setViewed((previous) => {
          const next = { ...previous, [sessionId]: Date.now() };
          writeViewed(next);
          return next;
        });
        openSession(sessionId);
      };
      useEffect(() => {
        if (pendingOpen === undefined) return;
        if (hostCurrentId === pendingOpen) setPendingOpen(undefined);
      }, [hostCurrentId, pendingOpen]);
      useEffect(() => {
        if (hostCurrentId === undefined) return;
        setViewed((previous) => {
          if (previous[hostCurrentId] !== undefined) return previous;
          const next = { ...previous, [hostCurrentId]: Date.now() };
          writeViewed(next);
          return next;
        });
      }, [hostCurrentId]);
      const currentId = pendingOpen !== undefined ? pendingOpen : hostCurrentId;
      const knownIds = useMemo(() => {
        const known = new Set();
        for (const sessionId of ids || []) known.add(sessionId);
        if (byId) for (const key of Object.keys(byId)) known.add(key);
        return known;
      }, [ids, byId]);
      const favoriteSet = useMemo(() => new Set(favorites || []), [favorites]);
      const categories = [
        {
          key: 'favorites',
          title: 'section.favorites',
          rows: groups.favorites,
          limit: 5,
          icon: () => h(StarIcon, { filled: true, size: 16 }),
        },
        {
          key: 'pending',
          title: 'section.pending',
          rows: groups.pending,
          limit: 3,
          icon: () => h(WarnIcon, { size: 16 }),
        },
        {
          key: 'running',
          title: 'section.running',
          rows: groups.running,
          limit: 3,
          icon: () => h(PlayIcon, { size: 16 }),
        },
        {
          key: 'unread',
          title: 'section.unread',
          rows: groups.unread,
          limit: 3,
          icon: () => h(CheckCircleIcon, { size: 16 }),
        },
        {
          key: 'recent',
          title: 'section.recent',
          rows: groups.recent,
          limit: 5,
          icon: () => h(ClockIcon, { size: 16 }),
        },
      ];
      const rendered = categories.filter((category) => category.rows.length > 0 || category.key === 'favorites');
      const attention = groups.pending.length + groups.unread.length;
      const hasActive = groups.pending.length + groups.running.length + groups.unread.length > 0;
      const countOf = {
        favorites: groups.favorites.length,
        pending: groups.pending.length,
        running: groups.running.length,
        unread: groups.unread.length,
        recent: groups.recent.length,
      };
      /** Data-driven default: Favorites always starts folded; the other groups fold when empty. */
      const defaultCollapsed = (key) => {
        if (key === 'favorites') return true;
        if (key === 'recent') return hasActive || groups.recent.length === 0;
        return countOf[key] === 0;
      };
      const isCollapsed = (key) => {
        if (countOf[key] === 0) return true;
        return overrides[key] === undefined ? defaultCollapsed(key) : overrides[key] === true;
      };

      const needle = query.trim().toLowerCase();
      const matches = useMemo(() => {
        const all = groups.all || [];
        if (!needle) return all.slice(0, 20);
        const hits = [];
        for (const row of all) {
          if (hits.length >= 50) break;
          const title = row.title ? row.title.toLowerCase() : '';
          const where = row.where ? row.where.toLowerCase() : '';
          if (title.indexOf(needle) >= 0 || where.indexOf(needle) >= 0) hits.push(row);
        }
        return hits;
      }, [groups.all, needle]);

      /** Wrap the matched span of a title so search hits are obvious. */
      const highlight = (title) => {
        if (!searching || !needle) return title;
        const lower = title.toLowerCase();
        const at = lower.indexOf(needle);
        if (at < 0) return title;
        return [
          title.slice(0, at),
          h('mark', { key: 'mark', className: 'drs-mark' }, title.slice(at, at + needle.length)),
          title.slice(at + needle.length),
        ];
      };

      const readEdges = () => {
        const node = listRef.current;
        if (!node) return;
        const top = node.scrollTop > 2;
        const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 2;
        setEdges((previous) => (previous.top === top && previous.bottom === bottom ? previous : { top, bottom }));
      };

      useEffect(() => {
        if (!searching) return undefined;
        const node = searchRef.current;
        if (node) node.focus();
        return undefined;
      }, [searching]);

      /**
       * Dragging a session out of the Workspaces list needs the height this
       * section occupies; fold to the one-line header for the duration of the
       * drag (the header itself stays a drop target) and restore afterwards.
       */
      useEffect(() => {
        const onDragStart = (event) => {
          const node = sectionRef.current;
          if (node && node.contains(event.target)) return;
          setDragFold(true);
        };
        const onDragEnd = () => setDragFold(false);
        document.addEventListener('dragstart', onDragStart, true);
        window.addEventListener('dragend', onDragEnd);
        window.addEventListener('drop', onDragEnd);
        return () => {
          document.removeEventListener('dragstart', onDragStart, true);
          window.removeEventListener('dragend', onDragEnd);
          window.removeEventListener('drop', onDragEnd);
        };
      }, []);

      useEffect(() => {
        readEdges();
      }, [groups, searching, query, open, overrides, expanded]);

      const effectiveOpen = open && !dragFold;
      useEffect(() => {
        const node = listRef.current;
        if (!node) return;
        node.scrollTop = savedScroll.current;
        readEdges();
      }, [effectiveOpen]);

      /** A drag can end anywhere (Esc, dropped outside); never leave the ring behind. */
      useEffect(() => {
        if (dropZone === null && dropBefore === null) return undefined;
        const clear = () => {
          setDropZone(null);
          setDropBefore(null);
        };
        window.addEventListener('dragend', clear);
        window.addEventListener('drop', clear);
        return () => {
          window.removeEventListener('dragend', clear);
          window.removeEventListener('drop', clear);
        };
      }, [dropZone, dropBefore]);

      const toggleOpen = () => {
        const node = listRef.current;
        if (node) writeInlineScroll(node.scrollTop);
        setOpen((value) => {
          const next = !value;
          writeInlineOpen(next);
          return next;
        });
      };
      const openSearch = () => {
        setSearching(true);
        if (!open) {
          setOpen(true);
          writeInlineOpen(true);
        }
      };
      const closeSearch = () => {
        setQuery('');
        setSearching(false);
      };
      const toggleCategory = (key) => {
        setOverrides((state) => {
          const next = { ...state, [key]: !isCollapsed(key) };
          writeCategoryOverrides(next);
          return next;
        });
      };
      const toggleOverflow = (key) => {
        setExpanded((state) => ({ ...state, [key]: state[key] !== true }));
      };
      const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
      };
      /** Arrow keys walk the visible rows and category headers; inputs keep their own keys. */
      const onNavKey = (event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        const target = event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        const items = Array.from(event.currentTarget.querySelectorAll('[data-drs-item]'));
        if (items.length === 0) return;
        const index = items.indexOf(document.activeElement);
        if (index < 0) return;
        const next = items[index + (event.key === 'ArrowDown' ? 1 : -1)];
        if (!next) return;
        event.preventDefault();
        next.focus();
      };
      const onListScroll = () => {
        const node = listRef.current;
        if (!node) return;
        savedScroll.current = node.scrollTop;
        const stamp = Date.now();
        if (stamp - scrollWriteAt.current > 250) {
          scrollWriteAt.current = stamp;
          writeInlineScroll(node.scrollTop);
        }
        readEdges();
      };

      const renderRow = (row, options) => {
        const favorite = favoriteSet.has(row.id);
        const pinned = pinnedSet.has(row.id);
        const label = t(favorite ? 'action.unfavorite' : 'action.favorite');
        const selected = row.id === currentId;
        const pendingNote = row.state === 'pending'
          ? t(
              row.pendingKind === 'approval'
                ? 'inline.pending.approval'
                : row.pendingKind === 'question'
                  ? 'inline.pending.question'
                  : 'inline.pending.other',
            )
          : undefined;
        const dropProps = favorite
          ? {
              onDragOver: (event) => {
                if (!isSessionDrag(event)) return;
                event.preventDefault();
                event.stopPropagation();
                if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
                setDropBefore((current) => (current === row.id ? current : row.id));
              },
              onDragLeave: (event) => {
                if (event.currentTarget.contains(event.relatedTarget)) return;
                setDropBefore((current) => (current === row.id ? null : current));
              },
              onDrop: (event) => {
                const sessionId = readDragId(event, knownIds);
                setDropBefore(null);
                setDropZone(null);
                if (sessionId === undefined) return;
                event.preventDefault();
                event.stopPropagation();
                insertFavoriteBefore(sessionId, row.id);
              },
            }
          : {};
        return h(
          'div',
          {
            key: row.id,
            'data-drs-item': 'row',
            className:
              'drs-row' +
              (selected ? ' drs-row--selected' : '') +
              (dropBefore === row.id ? ' drs-row--dropBefore' : ''),
            role: 'treeitem',
            tabIndex: 0,
            title: row.title + (row.where ? ' · ' + row.where : '') + (pendingNote ? ' · ' + pendingNote : ''),
            draggable: true,
            onDragStart: (event) => {
              const transfer = event.dataTransfer;
              if (!transfer) return;
              try {
                transfer.effectAllowed = 'move';
                transfer.setData(DRAG_TYPE, row.id);
                transfer.setData('text/plain', row.id);
              } catch (error) {
                /* text/plain still carries the id when a custom type is refused */
              }
              setDropBefore(null);
              setDropZone(null);
            },
            onDragEnd: () => {
              setDropBefore(null);
              setDropZone(null);
            },
            onClick: () => openRow(row.id),
            onKeyDown: (event) => onKey(event, () => openRow(row.id)),
            ...dropProps,
          },
          h(
            'span',
            { className: 'drs-rowSlot', 'aria-hidden': 'true' },
            h('span', { className: 'drs-dot drs-dot--' + row.state, title: t('dot.' + row.state) }),
          ),
          h('span', { className: 'drs-rowTitle' }, highlight(row.title)),
          pendingNote ? h('span', { className: 'drs-rowNote' }, pendingNote) : h('span', { className: 'drs-rowTime' }, row.time),
          pinned
            ? h(
                'span',
                { className: 'drs-rowPinIcon', role: 'img', 'aria-label': t('row.pinned'), title: t('row.pinned') },
                h(PinIcon, { size: 12 }),
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'drs-rowBtn',
              'aria-label': t('action.more'),
              title: t('action.more'),
              onClick: (event) => {
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                setRowMenu({
                  id: row.id,
                  top: Math.min(rect.bottom + 4, window.innerHeight - 200),
                  left: Math.max(8, Math.min(rect.left, window.innerWidth - 210)),
                });
              },
            },
            h(EllipsisIcon, { size: 14 }),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'drs-rowBtn',
              'aria-label': t('action.archive'),
              title: t('action.archive'),
              onClick: (event) => {
                event.stopPropagation();
                archiveSession(row.id);
              },
            },
            h(ArchiveIcon, { size: 14 }),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'drs-rowStar' + (favorite ? ' drs-rowStar--on' : ''),
              'aria-label': label,
              title: label,
              onClick: (event) => {
                event.stopPropagation();
                toggleFavorite(row.id);
              },
            },
            h(StarIcon, { filled: favorite, size: 12 }),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'drs-rowBtn' + (pinned ? ' drs-rowBtn--on' : ''),
              'aria-label': pinned ? t('action.unpin') : t('action.pin'),
              title: pinned ? t('action.unpin') : t('action.pin'),
              onClick: (event) => {
                event.stopPropagation();
                togglePin(row.id);
              },
            },
            pinned ? h(PinIcon, { size: 13 }) : h(PinOutlineIcon, { size: 13 }),
          ),
        );
      };

      const renderCategory = (category) => {
        if (category.rows.length === 0 && category.key !== 'favorites') return null;
        const folded = isCollapsed(category.key);
        const isExpanded = expanded[category.key] === true;
        const visible = isExpanded ? category.rows : category.rows.slice(0, category.limit);
        const hidden = category.rows.length - visible.length;
        const dropRing = dropZone === 'favorites' && category.key === 'favorites';
        return h(
          'div',
          {
            key: category.key,
            className: 'drs-group' + (dropRing ? ' drs-group--drop' : ''),
            role: 'group',
            ...(category.key === 'favorites'
              ? {
                  onDragOver: (event) => {
                    if (!isSessionDrag(event)) return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
                    setDropZone('favorites');
                  },
                  onDragLeave: (event) => {
                    if (event.currentTarget.contains(event.relatedTarget)) return;
                    setDropZone((current) => (current === 'favorites' ? null : current));
                  },
                  onDrop: (event) => {
                    const sessionId = readDragId(event, knownIds);
                    setDropZone(null);
                    if (sessionId === undefined) return;
                    event.preventDefault();
                    event.stopPropagation();
                    addFavorite(sessionId);
                  },
                }
              : {}),
          },
          h(
            'div',
            {
              className: 'drs-projectRow',
              'data-drs-item': 'group',
              role: 'treeitem',
              tabIndex: 0,
              'aria-expanded': folded ? 'false' : 'true',
              onClick: () => toggleCategory(category.key),
              onKeyDown: (event) => onKey(event, () => toggleCategory(category.key)),
            },
            h('span', { className: 'drs-glyphSlot drs-folder', 'aria-hidden': 'true' }, category.icon()),
            h(
              'span',
              { className: 'drs-glyphSlot drs-chevron', 'aria-hidden': 'true' },
              h(TriangleIcon, { size: 16, open: !folded }),
            ),
            h('span', { className: 'drs-projectTitle' }, t(category.title)),
            category.rows.length > 0
              ? h('span', { className: 'drs-projectCount' }, String(category.rows.length))
              : category.key === 'favorites'
                ? h('span', { className: 'drs-projectHint' }, t('inline.favHint'))
                : null,
          ),
          folded
            ? null
            : category.rows.length === 0
              ? h('div', { className: 'drs-inlineEmpty' }, t(dropZone !== null ? 'inline.drop' : 'inline.favEmpty'))
              : visible.map((row) => renderRow(row)),
          folded || hidden === 0
            ? null
            : h(
                'button',
                {
                  type: 'button',
                  className: 'drs-overflow',
                  'aria-expanded': isExpanded ? 'true' : 'false',
                  onClick: () => toggleOverflow(category.key),
                },
                isExpanded ? t('inline.collapse') : t('inline.expand', { n: hidden }),
              ),
        );
      };

      const collapsedLabel = t(open ? 'inline.collapseAll' : 'inline.expandAll');
      const nothingYet = !searching && (groups.all || []).length === 0;
      const listClass =
        'drs-groups' +
        (searching ? ' drs-groups--search' : '') +
        (edges.top ? ' drs-edge-top' : '') +
        (edges.bottom ? ' drs-edge-bottom' : '');

      return h(
        'section',
        {
          ref: sectionRef,
          className: 'drs-inline',
          'aria-label': t('inline.title'),
          onKeyDown: onNavKey,
          onDragOver: (event) => {
            if (!isSessionDrag(event)) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            setDropZone((current) => (current === 'favorites' ? current : 'section'));
          },
          onDragLeave: (event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            setDropZone(null);
          },
          onDrop: (event) => {
            const sessionId = readDragId(event, knownIds);
            setDropZone(null);
            setDropBefore(null);
            if (sessionId === undefined) return;
            event.preventDefault();
            addFavorite(sessionId);
          },
        },
        h(
          'div',
          { className: 'drs-sectionHeader' },
          searching
            ? [
                h('input', {
                  key: 'query',
                  ref: searchRef,
                  className: 'drs-searchInput',
                  type: 'text',
                  placeholder: t('inline.search.placeholder'),
                  value: query,
                  onChange: (event) => setQuery(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Escape') {
                      closeSearch();
                      return;
                    }
                    if (event.key !== 'Enter') return;
                    const first = matches[0];
                    if (!first) return;
                    event.preventDefault();
                    openRow(first.id);
                  },
                }),
                h(
                  'button',
                  {
                    key: 'close',
                    type: 'button',
                    className: 'drs-headerBtn',
                    'aria-label': t('inline.search.clear'),
                    title: t('inline.search.clear'),
                    onClick: closeSearch,
                  },
                  h(CloseIcon, { size: 14 }),
                ),
              ]
            : [
                h(
                  'button',
                  {
                    key: 'title',
                    type: 'button',
                    className: 'drs-sectionToggle',
                    'aria-expanded': open ? 'true' : 'false',
                    title: collapsedLabel,
                    onClick: toggleOpen,
                  },
                  h('span', { className: 'drs-sectionLabel' }, t(dragFold && dropZone === 'section' ? 'inline.drop' : 'inline.title')),
                  attention > 0 ? h('span', { className: 'drs-sectionCount' }, String(attention)) : null,
                ),
                h('span', { key: 'spacer', className: 'drs-sectionSpacer' }),
                h(
                  'div',
                  { key: 'actions', className: 'drs-headerActions' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'drs-headerBtn',
                      'aria-label': t('inline.search'),
                      title: t('inline.search'),
                      onClick: openSearch,
                    },
                    h(SearchIcon, { size: 16 }),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'drs-headerBtn',
                      'aria-label': collapsedLabel,
                      title: collapsedLabel,
                      onClick: toggleOpen,
                    },
                    h(CollapseAllIcon, { size: 16, collapsed: !open }),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'drs-headerBtn',
                      'aria-label': t('inline.openPanel'),
                      title: t('inline.openPanel'),
                      onClick: () => selectPanel(PANEL_ID),
                    },
                    h(OpenPanelIcon, { size: 16 }),
                  ),
                ),
              ],
        ),
        rowMenu
          ? h(RowMenu, {
              t,
              menu: rowMenu,
              favorite: favoriteSet.has(rowMenu.id),
              pinned: pinnedSet.has(rowMenu.id),
              onClose: () => setRowMenu(null),
              onFavorite: () => toggleFavorite(rowMenu.id),
              onMoveToTop: () => moveFavoriteToFront(rowMenu.id),
              onPin: () => togglePin(rowMenu.id),
              onUnpin: () => togglePin(rowMenu.id),
              onArchive: () => archiveSession(rowMenu.id),
            })
          : null,
        effectiveOpen
          ? h(
              'div',
              {
                ref: listRef,
                className: listClass,
                onScroll: onListScroll,
                role: 'tree',
                'aria-label': t('inline.title'),
                style: maxHeight === undefined ? undefined : { maxHeight: maxHeight + 'px' },
              },
              searching
                ? matches.length === 0
                  ? h('div', { className: 'drs-inlineEmpty' }, t('inline.search.empty'))
                  : [
                      ...matches.slice(0, SEARCH_LIMIT).map((row) => renderRow(row)),
                      matches.length > SEARCH_LIMIT
                        ? h(
                            'div',
                            { key: 'more', className: 'drs-searchMore' },
                            t('inline.search.more', { n: matches.length - SEARCH_LIMIT }),
                          )
                        : null,
                    ]
                : nothingYet
                  ? h('div', { className: 'drs-inlineEmpty' }, t('inline.noSessions'))
                  : rendered.map(renderCategory),
            )
          : null,
      );
    }

    /** One global panel launcher row. */
    function PanelRow({ id, label, wide, usePanelInfo, selectPanel, renderSlot }) {
      const active = usePanelInfo((info) => info.activePanelId === id);
      return h(
        'button',
        {
          type: 'button',
          className: 'drs-panelRow' + (active ? ' drs-panelRow--active' : ''),
          'aria-label': label,
          'aria-current': active ? 'page' : undefined,
          title: wide ? undefined : label,
          onClick: () => selectPanel(id),
        },
        h(
          'span',
          { className: 'drs-panelGlyph', 'aria-hidden': 'true' },
          renderSlot('sidebar.panellist', { size: wide ? 16 : 18, active }, { only: id }),
        ),
        wide ? h('span', { className: 'drs-panelTitle' }, label) : null,
      );
    }

    /** The panel list's More launcher; its rows come from `sidebar.panellist.actions`. */
    function PanelMoreMenu({ wide, label, entries, onOpen, onPinnedChange, renderSlot, t }) {
      const [open, setOpen] = useState(false);
      const wrapRef = React.useRef(null);
      const close = () => setOpen(false);
      useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
          if (wrapRef.current && wrapRef.current.contains(event.target)) return;
          setOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('mousedown', onPointerDown);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [open]);
      return h(
        'div',
        { className: 'drs-moreWrap', ref: wrapRef },
        h(
          'button',
          {
            type: 'button',
            className: 'drs-panelRow',
            'aria-label': label,
            'aria-haspopup': 'menu',
            'aria-expanded': open ? 'true' : 'false',
            title: wide ? undefined : label,
            onClick: () => setOpen((value) => !value),
          },
          h('span', { className: 'drs-panelGlyph', 'aria-hidden': 'true' }, h(AppsAddIcon, { size: wide ? 16 : 18 })),
          wide ? h('span', { className: 'drs-panelTitle' }, label) : null,
        ),
        open
          ? h(
              'div',
              { className: 'drs-moreMenu', role: 'menu' },
              h(
                Guard,
                { fallback: null },
                renderSlot('sidebar.panellist.actions', {
                  entries,
                  onOpen,
                  onPinnedChange,
                  onDismiss: close,
                }),
              ),
            )
          : null,
      );
    }

    /**
     * The left column shell. Declares the same holes as the shipped sidebar so
     * every panel, the settings seat, the footer actions and the official
     * workspace/session browser keep working, and inserts the plugin's inline
     * "最近会话" group above the browser.
     */
    function SidebarShell(props) {
      const {
        collapsed,
        width,
        startSession,
        toggleSidebar,
        selectPanel,
        setPinned,
        toggleFavorite,
        addFavorite,
        insertFavoriteBefore,
        moveFavoriteToFront,
        openSession,
        pinSession,
        unpinSession,
        archiveSession,
        usePanels,
        useEntryPins,
        useEntryActions,
        usePanelInfo,
        useSessions,
        useSessionStatus,
        useWorkspaces,
        useFavorites,
        t,
        renderSlot,
      } = props;

      const regionRef = React.useRef(null);
      const [sectionMax, setSectionMax] = useState(undefined);
      const panels = usePanels((snapshot) => snapshot);
      const unpinned = useEntryPins((ids) => ids);
      const activePanelId = usePanelInfo((info) => info.activePanelId);
      const hasEntryActions = useEntryActions((registered) => registered);
      const [settled, setSettled] = useState(collapsed);
      useEffect(() => {
        const node = regionRef.current;
        if (!node || typeof ResizeObserver === 'undefined') return undefined;
        const compute = () => {
          const height = node.clientHeight;
          if (!height) return;
          // The Workspaces list stays the primary surface: it keeps at least 55%
          // of the region (and never fewer than six session rows plus its header).
          // The header (36px + margins + the divider) is always there; only the
          // list above it competes with the Workspaces browser.
          const usable = Math.max(0, height - SECTION_CHROME);
          const browserFloor = Math.max(160, Math.round(usable * 0.55));
          const next = Math.max(0, Math.min(420, usable - browserFloor));
          setSectionMax((previous) => (previous === next ? previous : next));
        };
        compute();
        const observer = new ResizeObserver(compute);
        observer.observe(node);
        return () => {
          observer.disconnect();
        };
      }, [collapsed]);
      useEffect(() => {
        if (!collapsed) {
          setSettled(false);
          return undefined;
        }
        const timer = window.setTimeout(() => setSettled(true), SHELL_COLLAPSE_MS);
        return () => window.clearTimeout(timer);
      }, [collapsed]);
      const wide = !collapsed || !settled;
      const lastWideWidth = React.useRef(width);
      if (!collapsed) lastWideWidth.current = width;
      const everWide = React.useRef(!collapsed);
      if (!collapsed) everWide.current = true;

      const openNewSession = () => {
        try {
          startSession();
        } catch (error) {
          console.error('recent-sessions: new session failed', error);
        }
      };
      const toggleLabel = collapsed ? t('shell.toggle.open') : t('shell.toggle.collapse');
      const brandFallback = h(BrandMarkFallback, { size: 24 });

      const toggle = h(
        'button',
        {
          type: 'button',
          className: 'drs-iconButton',
          'aria-label': toggleLabel,
          title: toggleLabel,
          onClick: () => toggleSidebar(),
        },
        !wide
          ? h(
              'span',
              { key: 'rail', className: 'drs-railMark', 'aria-hidden': 'true' },
              renderSlot('sidebar.brand.mark', { size: 24 }, { fallback: brandFallback }),
            )
          : null,
        h('span', { key: 'glyph', className: 'drs-panelIcon' }, h(PanelLeftIcon, { size: wide ? 16 : 18 })),
        !wide ? renderSlot('sidebar.toggle.badge', {}) : null,
      );

      const brand = wide
        ? h(
            'button',
            {
              type: 'button',
              className: 'drs-brand',
              'aria-label': t('shell.newSession.label'),
              title: t('shell.newSession.label'),
              onClick: openNewSession,
            },
            h(
              'span',
              { className: 'drs-brandIdentity', 'aria-hidden': 'true' },
              h(
                'span',
                { className: 'drs-brandMark' },
                renderSlot('sidebar.brand.mark', { size: 24 }, { fallback: brandFallback }),
              ),
              h(
                'span',
                { className: 'drs-brandName' },
                renderSlot('sidebar.brand.name', {}, {
                  fallback: h('span', { className: 'drs-fallbackBrandName' }, t('shell.brand')),
                }),
              ),
            ),
          )
        : null;

      const newSession = h(
        'button',
        {
          type: 'button',
          className: 'drs-newSession',
          'aria-label': t('shell.newSession.label'),
          title: wide ? undefined : t('shell.newSession.label'),
          onClick: openNewSession,
        },
        h(
          'span',
          { className: 'drs-newSessionLabelMask' },
          h(
            'span',
            { className: 'drs-newSessionContent' },
            h(NewChatIcon, { size: wide ? 15 : 18 }),
            wide ? h('span', { className: 'drs-newSessionLabel' }, t('shell.newSession')) : null,
          ),
        ),
      );

      const visiblePanels = panels.filter(({ id }) => id === 'plugins' || unpinned.indexOf(id) < 0);

      return h(
        'div',
        {
          className:
            'drs-shell' +
            (wide ? '' : ' drs-shell--collapsed') +
            (!wide && everWide.current ? ' drs-railIn' : '') +
            (collapsed && wide ? ' drs-fading' : ''),
          style: wide ? { width: collapsed ? lastWideWidth.current : width } : undefined,
        },
        h('style', { key: 'shell-css' }, SHELL_CSS),
        h('div', { className: 'drs-logoRow' }, brand, toggle),
        newSession,
        visiblePanels.length > 0
          ? h(
              'nav',
              { className: 'drs-panelList', 'aria-label': t('shell.panels') },
              visiblePanels.map(({ id, label }) =>
                h(PanelRow, { key: id, id, label, wide, usePanelInfo, selectPanel, renderSlot }),
              ),
              hasEntryActions
                ? h(PanelMoreMenu, {
                    key: 'more',
                    wide,
                    label: t('shell.more'),
                    entries: panels
                      .filter(({ id }) => id !== 'plugins')
                      .map(({ id, label }) => ({
                        id,
                        label,
                        pinned: unpinned.indexOf(id) < 0,
                        active: id === activePanelId,
                      })),
                    onOpen: (id) => {
                      const panel = panels.find((candidate) => candidate.id === id);
                      if (panel !== undefined) selectPanel(panel.id);
                    },
                    onPinnedChange: setPinned,
                    renderSlot,
                    t,
                  })
                : null,
            )
          : null,
        h(
          'div',
          { className: 'drs-regionArea', ref: regionRef },
          wide
            ? h(
                Guard,
                {
                  key: 'inline',
                  fallback: h('div', { className: 'drs-inlineEmpty' }, t('inline.failed')),
                },
                h(RecentInlineGroup, {
                  wide,
                  t,
                  selectPanel,
                  openSession,
                  toggleFavorite,
                  addFavorite,
                  insertFavoriteBefore,
                  moveFavoriteToFront,
                  pinSession,
                  unpinSession,
                  archiveSession,
                  maxHeight: sectionMax,
                  useSessions,
                  useSessionStatus,
                  useWorkspaces,
                  useFavorites,
                }),
              )
            : null,
          h(
            'div',
            { key: 'browser', className: 'drs-browserSlot' },
            renderSlot('sidebar.workspaces', {
              wide,
              expandSidebar: () => {
                if (collapsed) toggleSidebar();
              },
            }),
          ),
        ),
        h(
          'div',
          { className: 'drs-footArea' },
          h('div', { className: 'drs-footerActions' }, renderSlot('sidebar.footer.action', { wide })),
          h('div', { className: 'drs-settingsArea' }, renderSlot('sidebar.settings', { wide })),
        ),
      );
    }

    /**
     * Window-chrome controls the frame mounts beside the traffic lights while a
     * macOS sidebar is fully collapsed; without them a collapsed sidebar could
     * not be reopened.
     */
    function ShellLeadingControls({ toggleSidebar, startSession, t }) {
      return h(
        'div',
        { className: 'drs-leading' },
        h(
          'button',
          {
            type: 'button',
            className: 'drs-leadingBtn',
            'aria-label': t('shell.toggle.open'),
            title: t('shell.toggle.open'),
            onClick: () => toggleSidebar(),
          },
          h(PanelLeftIcon, { size: 16 }),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'drs-leadingBtn',
            'aria-label': t('shell.newSession.label'),
            title: t('shell.newSession.label'),
            onClick: () => startSession(),
          },
          h(NewChatIcon, { size: 16 }),
        ),
      );
    }
    // #endregion

    // #region plugin
    /** Client services this plugin activates on. */
    const inject = ['slots', 'layout', 'uiWorkspace', 'locale'];

    /**
     * Register the sidebar entry, the panel it selects and the per-row star.
     * Each registration waits for its slot declaration and is disposed with
     * this plugin's fiber.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'recent-sessions: dictionaries');
      const t = ctx.locale.bind(NS);
      const favorites = createFavorites();
      const pins = createPanelPins();
      const panels = createPanelsSource(ctx);
      ctx.effect(() => () => panels.dispose(), 'recent-sessions: panel list');
      const entryActions = createEntryActionsSource(ctx);

      const openSession = (sessionId) => {
        try {
          ctx.uiWorkspace.openSession(sessionId);
        } catch (error) {
          console.error('recent-sessions: open session failed', error);
        }
      };
      /** Run one host session action; failures land in the console, never in the UI. */
      const runSessionAction = (label, run) => {
        try {
          const result = run();
          if (result && typeof result.catch === 'function') {
            result.catch((error) => console.error('recent-sessions: ' + label + ' failed', error));
          }
        } catch (error) {
          console.error('recent-sessions: ' + label + ' failed', error);
        }
      };
      const pinSession = (sessionId) => runSessionAction('pin', () => ctx.uiWorkspace.pinSession(sessionId));
      const unpinSession = (sessionId) => runSessionAction('unpin', () => ctx.uiWorkspace.unpinSession(sessionId));
      const archiveSession = (sessionId) => runSessionAction('archive', () => ctx.uiWorkspace.archiveSession(sessionId));
      const startSession = (workspaceId, options) => {
        try {
          ctx.uiWorkspace.startSession(workspaceId, options);
        } catch (error) {
          console.error('recent-sessions: new session failed', error);
        }
      };
      const toggleSidebar = () => {
        ctx.layout.toggleSidebar();
      };
      const selectPanel = (id) => {
        ctx.layout.selectPanel(id);
      };

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({
              hooks: { favorites: favorites.source },
              toggleFavorite: favorites.toggle,
              addFavorite: favorites.add,
              insertFavoriteBefore: favorites.insertBefore,
              moveFavoriteToFront: favorites.moveToFront,
              openSession,
            }),
          },
          RecentSessionsPage,
        ),
      );

      ctx.slots.inject('sidebar.workspaces.session.row.action', () =>
        ctx.slots.register(
          {
            name: 'sidebar.workspaces.session.row.action',
            id: 'recent-sessions.favorite',
            order: 150,
            locale: NS,
            inject: () => ({
              hooks: { favorites: favorites.source },
              toggleFavorite: favorites.toggle,
            }),
          },
          FavoriteRowButton,
        ),
      );

      ctx.slots.inject('sidebar', () =>
        ctx.slots.register(
          {
            name: 'sidebar',
            locale: NS,
            children: {
              'sidebar.brand.mark': { kind: 'single', scope: 'root' },
              'sidebar.brand.name': { kind: 'single', scope: 'root' },
              'sidebar.toggle.badge': { kind: 'single', scope: 'root' },
              'sidebar.panellist': { kind: 'list', scope: 'root' },
              'sidebar.panellist.actions': { kind: 'list', scope: 'root' },
              'sidebar.workspaces': { kind: 'single', scope: 'root' },
              'sidebar.settings': { kind: 'single', scope: 'root' },
              'sidebar.footer.action': { kind: 'list', scope: 'root' },
            },
            inject: () => ({
              startSession,
              toggleSidebar,
              selectPanel,
              setPinned: pins.setPinned,
              toggleFavorite: favorites.toggle,
              addFavorite: favorites.add,
              insertFavoriteBefore: favorites.insertBefore,
              moveFavoriteToFront: favorites.moveToFront,
              openSession,
              pinSession,
              unpinSession,
              archiveSession,
              hooks: {
                panels: panels.source,
                entryPins: pins.unpinned,
                entryActions,
                panelInfo: ctx.layout.panelInfo,
                favorites: favorites.source,
              },
            }),
          },
          (props) =>
            h(
              Guard,
              { fallback: h(SidebarFallback, props) },
              h(SidebarShell, props),
            ),
        ),
      );

      ctx.slots.inject('shell.leading', () =>
        ctx.slots.register(
          {
            name: 'shell.leading',
            locale: NS,
            inject: () => ({ toggleSidebar, startSession }),
          },
          ShellLeadingControls,
        ),
      );
    }

    return { inject, apply };
    // #endregion
  },
});
