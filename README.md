# Recent Sessions · dsh-recent-sessions

> A Workspaces-style **Recent sessions** section in the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) left sidebar — favorites, waiting-for-you, unread completions and running sessions at a glance.

It shares the official **Workspaces** grid and interactions: the sessions that need you and the ones you keep coming back to, in one place.

It takes over the left column shell, so the group sits **above the workspace groups** instead of living on its own page, and the official session browser (search, session `…` menu, drag reorder, archived filter, workspace management) keeps working unchanged inside it.

## What it looks like

```
┌──────────────────────────────────────┐
│  Recent sessions              [fold] [⤢]│  ← 36px section header, 28px actions
│    ★ Favorites                    5   │  ← 34px project row: glyph x=20, title x=40
│       ● Customer proposal   2 h ago ☆ │  ← 32px session row: dot x=32, title x=52
│       Show 2 more sessions            │  ← the shipped 28px overflow row
│    ⚠ Waiting for you              1   │
│       ● Fix login timeout        now  │
│    ▶ Running                      1   │  (collapsed by default)
│    ✓ Unread completions            1   │
│    🕒 Recently active              5   │  (collapsed by default)
├──────────────────────────────────────┤  ← 1px divider
│  Workspaces                [view] [+ ] │  ← the official section, untouched
│    📁 Workspace A                     │
│       ● …                             │
└──────────────────────────────────────┘
```

- The **section header** matches 「工作区」: 36px tall, 14px/20 `label-tertiary`, 4px left padding, two 28×28 icon actions on the right (collapse/expand all, open in the panel).
- Each **category** is a workspace-style project row: 34px tall, 16×20 glyph slot, 14px/20 title, a filled triangle that takes the glyph's place on hover, click to fold, plus a 10px count.
- Each **session row** matches the shipped row: 32px tall, status dot in the 16×20 slot, 14px/20 title, 10px relative time; on hover the time yields to the ☆ star; the session open in the main column keeps the selected background.
- The **overflow row** is the shipped `Show N more sessions / Collapse` (28px, 12px, `label-tertiary`).
- 2px between rows and 4px between groups, the same rhythm as the official list; a 1px divider separates this section from Workspaces.

## Favorites

Three ways:

1. click the `☆` on a session row (a new hover button in the shipped row strip);
2. **drag** a session row onto the Recent sessions group (from the official list below);
3. on the panel page, drop onto the Favorites section, or onto an existing favorite to reorder.

Favorites keep their display order and are stored in the browser (see Data).

## Install

**From the plugin market (recommended)**: Plugins → Discover → **Add index source** and paste

```
https://raw.githubusercontent.com/tianxiaz/dsh-recent-sessions/main/market/index.json
```

(GitHub Pages alternative once enabled: `https://tianxiaz.github.io/dsh-recent-sessions/market/index.json`)

**Command line**:

```bash
dsh plugin --profile <profile> add "git+https://github.com/tianxiaz/dsh-recent-sessions.git"
```

**From a local directory** (development):

```
plugin_manager install_bundle  <absolute path>/dsh-recent-sessions
```

Reload the Web page afterwards (hard reload).

## ⚠️ Sidebar takeover

Both key seats of the left column are **single-occupant slots**, so a plugin cannot insert a section beside the shipped groups:

| Slot | Shipped occupant | What it is |
|---|---|---|
| `sidebar` | `@deepseek-ai/dsh-client-ui-sidebar` SidebarRoot | the whole left column shell (brand row, New session, panel list, foot) |
| `sidebar.workspaces` | `@deepseek-ai/dsh-client-ui-workspace` WorkspaceBrowser | the session browsing region |

So this plugin **owns the shell and reuses the browser**:

- its bundle patch disables `ui-sidebar` (`- id: ui-sidebar` + `disabled: true`);
- it registers the `sidebar` seat and declares the same eight child slots (`brand.mark`, `brand.name`, `toggle.badge`, `panellist`, `panellist.actions`, `workspaces`, `settings`, `footer.action`), then renders the official WorkspaceBrowser through `sidebar.workspaces` unchanged;
- it also provides `shell.leading` (the "open sidebar / new session" window chrome the frame mounts on macOS while the sidebar is fully collapsed) — without it a collapsed sidebar could not be reopened.

Consequences:

- the brand row, New session button, panel list and foot are rendered by this plugin (geometry and colors aligned with the shipped shell, **not pixel-identical**);
- if DSH changes its sidebar, this plugin needs a matching update (see below);
- to revert, disable or remove the bundle: the official sidebar returns (the panel page and the `☆` button go away with it).

## Compatibility and maintenance

- Target: DSH `^0.2.1-rc.5` (`engines.dsh`).
- Known failure mode: if a DSH release **renames or drops** the `ui-sidebar` row id, the patch is warned about and skipped, this plugin's `sidebar` registration then collides with the shipped shell and the whole plugin stays inactive (the official UI is untouched). Fix: update the row id in `cordis.patch.yml` and re-align the shell if needed.
- Post-upgrade checklist (all in the `sidebar shell` region of `client.js`):
  1. are the `sidebar` owner props still `{ collapsed, width }`;
  2. is the declared child set still those eight slots;
  3. did the shipped `SidebarRoot` geometry change (logo row 60/36px, new-session 38/36px, panel row 36px, collapsed padding 18/10/6) → update `SHELL_CSS`;
  4. owner props of `sidebar.panellist` (`size`/`active`) and `sidebar.workspaces` (`wide`/`expandSidebar`);
  5. `shell.leading` mount condition (macOS + collapsed);
  6. whether the official browser is still a single occupant of `sidebar.workspaces`.

## Data and privacy

- Client-only plugin: **no network requests** of its own.
- Favorites and the group's disclosure state live in the current browser's `localStorage`: `dsh.recent-sessions.favorites.v1` (session ids in display order) and `dsh.recent-sessions.inline.open.v1`.
- Archived sessions are not listed (their favorite entries are kept and return when unarchived); favorites are per origin, so another browser or host does not share them.

## License

MIT, see [LICENSE](./LICENSE).
