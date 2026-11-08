# DSH 官方 Discussions 帖子（0.1.8，可直接粘贴）

> ✅ 已发布：<https://github.com/deepseek-ai/deepseek-harness/discussions/12593>（2026-11-08）
> 另两条在 awesome-dsh-plugin：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/discussions/11551> · [/11552](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/discussions/11552)
> 复核：图片经 camo 代理正常渲染、市场/仓库链接可点、`Show and tell` 分类需在页面上确认。

**入口**：<https://github.com/deepseek-ai/deepseek-harness/discussions> → **New discussion**
**分类**：Show and tell（没有就选最接近"展示/插件"的）
**标题**：

```
Recent Sessions — a left-sidebar section built on the official Workspaces grid
```

**正文**（整段复制，末尾图片行一起）：

```markdown
With a few tasks in flight, "what is running, what finished and I haven't read, what is waiting for my approval, and which ones do I keep coming back to" takes a lot of scrolling in the sidebar. **Recent Sessions** adds a section above the workspace groups, built on the exact same grid as the shipped Workspaces browser (36 / 34 / 32 / 28 px).

**What you get**

- **Favorites · running · waiting for you · unread completions · recently active** — five groups at a glance, with the shipped yellow / blue / green status dots.
- **A ☆ on every session row** (the official rows included): one hover-click to favorite, no panel and no drag.
- **The same hover strip as the shipped rows**: ⋯ more / archive / ☆ favorite / pin. The ⋯ menu holds pin · favorite · move to top · archive · copy session id.
- **Pin is scoped to the group you are looking at**: pin in Recently active and only that list reorders; Favorites keeps its own manual order (and unpinning puts the row back where it was).
- **Collapse the whole block to one line** when you need the height back — the choice and the scroll offset are remembered.
- **Search in place** from the magnifier (matches highlighted, `Enter` opens the first hit) and walk the section with `↑` / `↓`.
- Only sessions that belong to a **workspace** are listed; ungrouped ones (a one-off CLI run in `/tmp`) surface only while they wait for your answer.

**How it works (worth knowing before installing)**

The sidebar seats are single-occupant, so this plugin **takes over the `sidebar` shell** (the shipped `ui-sidebar` package is disabled) and renders the official `sidebar.workspaces` browser inside it unchanged — search, session `…` menu, drag reorder, archive filters and workspace management keep working. Disabling the bundle restores the official sidebar as-is, and a sidebar-level error boundary degrades to a notice plus the official session list instead of an empty column. The section also keeps the Workspaces list at ≥55% of the region, so it never starves the browser.

**Install**

- Plugins → Discover → Add index source → `https://tianxiaz.github.io/dsh-recent-sessions/market/index.json`
- or: `dsh plugin --profile <profile> add "git+https://github.com/tianxiaz/dsh-recent-sessions.git"`

Market entry: https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
Repo: https://github.com/tianxiaz/dsh-recent-sessions
Requires DSH `^0.2.1-rc.5`. MIT, client-only, no network calls (favorites/pins live in your browser). Not compatible with the recent-sessions plugin from `huangxp12` / `whybebabo` (same panel id) — install one or the other.

![Recent Sessions in the DSH sidebar](https://tianxiaz.github.io/dsh-recent-sessions/docs/social-preview.png)
```

---

## 备选：Discord 短版（拿到角色后发）

```
Recent Sessions for DSH — a left-sidebar section built on the official Workspaces grid.

favorites / running / waiting-for-you / unread / recently active · a ☆ on every session row · the same hover strip as the shipped rows (⋯ archive ☆ pin) · collapse to one line · search in place.

Market: https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
Repo: https://github.com/tianxiaz/dsh-recent-sessions
(Incompatible with the recent-sessions plugin from huangxp12 / whybebabo — pick one.)
```

---

## 发完 30 分钟

1. 帖子链接发我，我核对渲染（图片、代码块、链接）；
2. 有人问"会不会改坏官方侧栏" → 回：官方会话区一行没改，禁用插件即恢复；侧栏级 error boundary 兜底；
3. 有人问"和另一个 recent sessions 插件冲突吗" → 回：同一个面板 id，二选一；
4. 记一笔互动数，作为 D3 复盘的基线。
