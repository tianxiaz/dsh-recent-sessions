# 阶段 1 · 三条现成帖子（复制即发）

配图统一用 `docs/social-preview.png`（分享卡）；群里可换成 `docs/preview-desktop-light.png`（整窗图更直观）。
发之前 1 分钟：确认市场条目能打开（<https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/>）、仓库链接可点。

---

## 帖 1 · DSH 官方 Discussions

**入口**：<https://github.com/deepseek-ai/deepseek-harness/discussions> → **New discussion**
**分类**：Show and tell（没有就选最接近"展示"的）
**标题**：

```
Recent Sessions — a left-sidebar section on the official Workspaces grid
```

**正文**：

```markdown
With a few tasks in flight, "what is running, what finished and I haven't read, what is waiting for my approval, and which ones do I keep coming back to" takes a lot of scrolling in the sidebar. This plugin adds a **Recent sessions** section above the workspace groups, built on the exact same grid as the official Workspaces browser (36 / 34 / 32 / 28 px).

**What it does**

- **Favorites · running · waiting for you · unread completions · recently active** — five groups at a glance, with yellow / blue / green status dots.
- **A ☆ on every session row**, the official rows included: one hover-click to favorite, no panel and no drag.
- **Collapse the whole block to one line** when you need the height back; the choice is remembered.
- **Search in place** from the magnifier (matches are highlighted, `Enter` opens the first hit) and walk the section with `↑` / `↓`.
- Favorite rows can be reordered by dragging; hovering one reveals ↑ "move to top".

**How it works (worth knowing before you install)**

The sidebar slots are single-occupant, so this plugin **takes over the `sidebar` shell** (the shipped `ui-sidebar` package is disabled) and renders the official `sidebar.workspaces` browser inside it unchanged — search, session `…` menu, drag reorder, archive filters and workspace management all keep working. Disable the bundle and the official sidebar returns as-is. A sidebar-level error boundary degrades to a notice + the official session list instead of an empty column.

**Install**

- Plugins → Discover → Add index source → `https://tianxiaz.github.io/dsh-recent-sessions/market/index.json`
- or: `dsh plugin --profile <profile> add "git+https://github.com/tianxiaz/dsh-recent-sessions.git"`

Market entry: https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
Repo: https://github.com/tianxiaz/dsh-recent-sessions
Requires DSH `^0.2.1-rc.5`. Not compatible with the recent-sessions plugin from `huangxp12` / `whybebabo` (same panel id) — install one or the other.
```

**图**：把 `social-preview.png` 拖进正文末尾。

---

## 帖 2 · awesome-dsh-plugin Discussions

**入口**：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/discussions> → **New discussion**
**分类**：Show and tell
**标题**：

```
dsh-recent-sessions — Recent sessions that look like the official Workspaces
```

**正文**（短）：

```markdown
Thanks for merging the listing (#11008)! Posting it here too, in case it is useful to anyone.

**dsh-recent-sessions** adds a Recent sessions section to the DSH left sidebar, built on the official Workspaces grid: favorites / running / waiting-for-you / unread / recently active, with a one-click ☆ on every session row, one-line collapse and in-place search. It takes over the sidebar shell and renders the official browser unchanged; disabling the bundle restores the shipped sidebar.

Market: https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
Repo: https://github.com/tianxiaz/dsh-recent-sessions
Requires DSH `^0.2.1-rc.5`.
```

---

## 帖 3 · 你的 DSH 群 / 微信群

**先发文字**：

```
最近把「翻会话」这个事做成了插件，叫「最近会话」。

它不是浮层也不是新页面，而是像官方「工作区」一样长在左侧栏里的一个分区，用的就是官方那套网格：
· 收藏 / 运行中 / 等待你的回应 / 完成未读 / 最近活跃，一屏直达
· 每个会话行都有 ☆，一点就收藏（官方列表里的行也有）
· 整段能收起到一行，标题右边还能直接搜
· 官方会话区（搜索、菜单、拖拽排序、归档）一行没改，不想用了禁用就恢复原样

市场：https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
仓库：https://github.com/tianxiaz/dsh-recent-sessions

要装的话我可以帮你弄，装完有问题直接在这条下面说。
```

**再发图**：`preview-desktop-light.png`（整窗，最直观看得出"长在侧栏里"）。

---

## 发完之后（10 分钟）

1. 三条帖子各自收藏/置顶（Discussions 可以 pin 自己的讨论吗？不能，就用书签）；
2. 守 30 分钟评论，常见问题直接回（模板见 `docs/launch-day.md` 的"首日回复模板"）；
3. 记一笔：三个链接 + 有没有互动 + 问了什么。
