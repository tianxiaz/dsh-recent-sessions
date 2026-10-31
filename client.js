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
    /** Drag payload type this plugin sets on its own rows. */
    const DRAG_TYPE = 'application/x-dsh-recent-session';

    // #region locales
    /** Simplified Chinese dictionary (the key-set source of truth). */
    const zh = {
      'panel.label': '最近会话',
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
      'inline.collapseAll': '全部折叠',
      'inline.expandAll': '全部展开',
      'inline.openPanel': '在面板中打开',
    };
    /** English dictionary, checked complete against the zh key set. */
    const en = {
      'panel.label': 'Recent sessions',
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
      'inline.collapseAll': 'Collapse all',
      'inline.expandAll': 'Expand all',
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
      return { source, add, remove, insertBefore, toggle };
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
      const { ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now } = input;
      const archived = new Set(archivedIds || []);
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
        const running = !pending && status.running === true;
        const unread = !pending && !running && status.completionUnread === true;
        const state = pending ? 'pending' : running ? 'running' : unread ? 'unread' : 'idle';
        rows.push({
          id: sessionId,
          title: summary.displayTitle || sessionId,
          where:
            whereBySession.get(sessionId) ||
            (summary.cwd ? whereByPath.get(summary.cwd) || basename(summary.cwd) : ''),
          updatedAt: typeof summary.updatedAt === 'number' ? summary.updatedAt : 0,
          origin: summary.origin,
          state,
        });
      }
      rows.sort((left, right) => right.updatedAt - left.updatedAt);
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
      const highlighted = new Set();
      for (const row of favoriteRows) highlighted.add(row.id);
      for (const row of pendingRows) highlighted.add(row.id);
      for (const row of runningRows) highlighted.add(row.id);
      for (const row of unreadRows) highlighted.add(row.id);
      const recentRows = [];
      for (const row of topLevel) {
        if (recentRows.length >= RECENT_LIMIT) break;
        if (row.state !== 'idle' || highlighted.has(row.id)) continue;
        recentRows.push(row);
      }

      const decorate = (row) => ({ ...row, time: relativeLabel(row.updatedAt, now, t) });
      return {
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
      const { toggleFavorite, addFavorite, insertFavoriteBefore, openSession } = props;

      const ids = useSessions((state) => state.ids);
      const byId = useSessions((state) => state.byId);
      const phase = useSessions((state) => state.phase);
      const statuses = useSessionStatus((snapshot) => snapshot);
      const workspaceItems = useWorkspaces((snapshot) => snapshot.items);
      const archivedIds = useWorkspaces((snapshot) => snapshot.archivedSessionIds);
      const favorites = useFavorites((list) => list);
      const now = useMinuteTick();
      const [dropTarget, setDropTarget] = useState(null);

      const knownIds = useMemo(() => {
        const known = new Set();
        for (const sessionId of ids || []) known.add(sessionId);
        if (byId) for (const key of Object.keys(byId)) known.add(key);
        return known;
      }, [ids, byId]);

      const favoriteSet = useMemo(() => new Set(favorites || []), [favorites]);
      const groups = useMemo(
        () => buildGroups({ ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now }),
        [ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now],
      );
      /** The session the main column currently shows, read from the mainView retain count. */
      const currentId = useMemo(() => {
        if (!byId) return undefined;
        for (const sessionId of Object.keys(byId)) {
          const summary = byId[sessionId];
          if (summary && summary.retainedBy && summary.retainedBy.mainView > 0) return sessionId;
        }
        return undefined;
      }, [byId]);

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
              onClick: () => openSession(row.id),
            },
            h('span', { className: 'drs-name' }, row.title),
            row.where ? h('span', { className: 'drs-where' }, row.where) : null,
          ),
          h('span', { className: 'drs-time' }, row.time),
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
.drs-sectionLabel{flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}
.drs-sectionSpacer{flex:1;min-width:4px}
.drs-headerActions{flex:none;display:flex;align-items:center;gap:4px}
.drs-headerBtn{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:6px;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer}
.drs-headerBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-headerBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.drs-groups{display:flex;flex-direction:column}
.drs-group{position:relative;display:flex;flex-direction:column}
.drs-group>*+*{margin-top:2px}
.drs-group+.drs-group{margin-top:4px}
.drs-group--drop{box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary);border-radius:8px}
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
.drs-row:hover .drs-rowTime{display:none}
.drs-row:hover .drs-rowStar,.drs-rowStar--on{display:grid}
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
`;

    /**
     * The sidebar's inline "最近会话" section.
     *
     * Mirrors the shipped browsing region layer for layer: a 36px section header
     * (title left, 28px icon actions right) like 「工作区」, one 34px project row
     * per category (16px glyph that swaps for a disclosure triangle on hover),
     * 32px session rows with a 16px status slot, the shipped 28px overflow row,
     * and the shipped 2px row / 4px group rhythm.
     */
    function RecentInlineGroup(props) {
      const { t, selectPanel, openSession, toggleFavorite, addFavorite } = props;
      const { useSessions, useSessionStatus, useWorkspaces, useFavorites } = props;
      const ids = useSessions((state) => state.ids);
      const byId = useSessions((state) => state.byId);
      const statuses = useSessionStatus((snapshot) => snapshot);
      const workspaces = useWorkspaces((snapshot) => snapshot);
      const favorites = useFavorites((list) => list);
      const now = useMinuteTick();
      const [collapsed, setCollapsed] = useState(() => ({ ...INLINE_START_COLLAPSED }));
      const [expanded, setExpanded] = useState({});
      const [dropActive, setDropActive] = useState(false);

      const workspaceItems = workspaces ? workspaces.items : undefined;
      const archivedIds = workspaces ? workspaces.archivedSessionIds : undefined;
      const groups = useMemo(
        () => buildGroups({ ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now }),
        [ids, byId, statuses, workspaceItems, archivedIds, favorites, t, now],
      );
      /** The session the main column currently shows, read from the mainView retain count. */
      const currentId = useMemo(() => {
        if (!byId) return undefined;
        for (const sessionId of Object.keys(byId)) {
          const summary = byId[sessionId];
          if (summary && summary.retainedBy && summary.retainedBy.mainView > 0) return sessionId;
        }
        return undefined;
      }, [byId]);
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
      const anyExpanded = rendered.some((category) => collapsed[category.key] !== true);

      const toggleAll = () => {
        const next = {};
        for (const category of categories) next[category.key] = anyExpanded;
        setCollapsed(next);
      };
      const toggleCategory = (key) => {
        setCollapsed((state) => ({ ...state, [key]: state[key] !== true }));
      };
      const toggleOverflow = (key) => {
        setExpanded((state) => ({ ...state, [key]: state[key] !== true }));
      };
      const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
      };

      const renderRow = (row) => {
        const favorite = favoriteSet.has(row.id);
        const label = t(favorite ? 'action.unfavorite' : 'action.favorite');
        const selected = row.id === currentId;
        return h(
          'div',
          {
            key: row.id,
            className: 'drs-row' + (selected ? ' drs-row--selected' : ''),
            role: 'treeitem',
            'aria-selected': selected ? 'true' : 'false',
            tabIndex: 0,
            title: row.title,
            onClick: () => openSession(row.id),
            onKeyDown: (event) => onKey(event, () => openSession(row.id)),
          },
          h(
            'span',
            { className: 'drs-rowSlot', 'aria-hidden': 'true' },
            h('span', { className: 'drs-dot drs-dot--' + row.state, title: t('dot.' + row.state) }),
          ),
          h('span', { className: 'drs-rowTitle' }, row.title),
          h('span', { className: 'drs-rowTime' }, row.time),
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
        );
      };

      const renderCategory = (category) => {
        if (category.rows.length === 0 && category.key !== 'favorites') return null;
        const isCollapsed = collapsed[category.key] === true;
        const isExpanded = expanded[category.key] === true;
        const visible = isExpanded ? category.rows : category.rows.slice(0, category.limit);
        const hidden = category.rows.length - visible.length;
        const dropRing = dropActive && category.key === 'favorites';
        return h(
          'div',
          { key: category.key, className: 'drs-group' + (dropRing ? ' drs-group--drop' : '') },
          h(
            'div',
            {
              className: 'drs-projectRow',
              role: 'treeitem',
              tabIndex: 0,
              'aria-expanded': isCollapsed ? 'false' : 'true',
              onClick: () => toggleCategory(category.key),
              onKeyDown: (event) => onKey(event, () => toggleCategory(category.key)),
            },
            h('span', { className: 'drs-glyphSlot drs-folder', 'aria-hidden': 'true' }, category.icon()),
            h(
              'span',
              { className: 'drs-glyphSlot drs-chevron', 'aria-hidden': 'true' },
              h(TriangleIcon, { size: 16, open: !isCollapsed }),
            ),
            h('span', { className: 'drs-projectTitle' }, t(category.title)),
            category.rows.length > 0 ? h('span', { className: 'drs-projectCount' }, String(category.rows.length)) : null,
          ),
          isCollapsed
            ? null
            : category.rows.length === 0
              ? h('div', { className: 'drs-inlineEmpty' }, t(dropActive ? 'inline.drop' : 'inline.favEmpty'))
              : visible.map((row) => renderRow(row)),
          isCollapsed || hidden === 0
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

      return h(
        'section',
        {
          className: 'drs-inline',
          'aria-label': t('inline.title'),
          onDragOver: (event) => {
            if (!isSessionDrag(event)) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            setDropActive(true);
          },
          onDragLeave: (event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            setDropActive(false);
          },
          onDrop: (event) => {
            const sessionId = readDragId(event, knownIds);
            setDropActive(false);
            if (sessionId === undefined) return;
            event.preventDefault();
            addFavorite(sessionId);
          },
        },
        h(
          'div',
          { className: 'drs-sectionHeader' },
          h('span', { className: 'drs-sectionLabel' }, t('inline.title')),
          h('span', { className: 'drs-sectionSpacer' }),
          h(
            'div',
            { className: 'drs-headerActions' },
            h(
              'button',
              {
                type: 'button',
                className: 'drs-headerBtn',
                'aria-label': t(anyExpanded ? 'inline.collapseAll' : 'inline.expandAll'),
                title: t(anyExpanded ? 'inline.collapseAll' : 'inline.expandAll'),
                onClick: toggleAll,
              },
              h(CollapseAllIcon, { size: 16, collapsed: !anyExpanded }),
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
        ),
        h('div', { className: 'drs-groups' }, rendered.map(renderCategory)),
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
        openSession,
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

      const panels = usePanels((snapshot) => snapshot);
      const unpinned = useEntryPins((ids) => ids);
      const activePanelId = usePanelInfo((info) => info.activePanelId);
      const hasEntryActions = useEntryActions((registered) => registered);
      const [settled, setSettled] = useState(collapsed);
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
          { className: 'drs-regionArea' },
          wide
            ? h(
                Guard,
                { key: 'inline', fallback: null },
                h(RecentInlineGroup, {
                  wide,
                  t,
                  selectPanel,
                  openSession,
                  toggleFavorite,
                  addFavorite,
                  useSessions,
                  useSessionStatus,
                  useWorkspaces,
                  useFavorites,
                }),
              )
            : null,
          renderSlot('sidebar.workspaces', {
            wide,
            expandSidebar: () => {
              if (collapsed) toggleSidebar();
            },
          }),
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

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 20,
            label: () => t('panel.label'),
            locale: NS,
          },
          PanelIcon,
        ),
      );

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
              openSession,
              hooks: {
                panels: panels.source,
                entryPins: pins.unpinned,
                entryActions,
                panelInfo: ctx.layout.panelInfo,
                favorites: favorites.source,
              },
            }),
          },
          SidebarShell,
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
