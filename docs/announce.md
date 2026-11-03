# 发布文案（可直接粘贴）

配图：`docs/social-preview.png`（1280×640，分享卡）、`docs/preview-desktop-light.png`（整窗示意）

---

## 中文

**标题**：最近会话 —— 像官方「工作区」一样长在 DSH 左侧栏里的快捷分区

**一句话**：收藏 / 运行中 / 等待你的回应 / 完成未读 / 最近活跃，一屏直达；每个会话行一点 ☆ 就收藏。

**正文**

DSH 的会话一多，「哪个在跑、哪个跑完了还没看、哪个在等我授权、我常回访的是哪几个」就得翻半天。这个插件在左侧栏加了一个**和官方「工作区」完全同构**的「最近会话」分区：

- 36 / 34 / 32 / 28px 的分区标题、分组行、会话行、溢出行，与官方同一套网格；不另开页面、不是浮层，官方会话区（搜索、会话菜单、拖拽排序、归档筛选）一行没改；
- 五个维度：**收藏 · 运行中 · 等待你的回应 · 完成未读 · 最近活跃**；黄 = 待授权/待回答、蓝 = 运行中、绿 = 完成未读；
- **每个会话行都有 ☆**（包括官方列表里的行），悬停一点即收藏，不用进面板、不用拖拽；
- 整段可**一键收起到一行**，把高度还给工作区列表，选择会被记住；
- 标题右侧 🔍 可以**就地搜索**本分区；
- 纯前端、无网络请求，收藏存在本机浏览器；不想要了禁用插件即恢复官方侧栏。

**安装**

```
Plugins → Discover → Add index source
https://tianxiaz.github.io/dsh-recent-sessions/market/index.json
```

或

```bash
dsh plugin --profile <你的 profile> add "git+https://github.com/tianxiaz/dsh-recent-sessions.git"
```

市场条目：https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
仓库：https://github.com/tianxiaz/dsh-recent-sessions

> ⚠️ 与 `huangxp12` / `whybebabo` 的最近会话插件**互斥**（面板 id 冲突），不要同时安装。

---

## English

**Title**: Recent Sessions — a Workspaces-native quick-access section in the DSH sidebar

**One-liner**: Favorites, running, waiting-for-you, unread and recently active sessions at a glance — with a one-click ☆ on every session row.

**Body**

With a few tasks in flight, "what is running, what finished and I haven't read, what is waiting for my approval, and which ones do I keep coming back to" takes a lot of scrolling. This plugin adds a **Recent sessions** section to the left sidebar built on the **exact same grid as the official Workspaces**: 36 / 34 / 32 / 28px section header, group rows, session rows and overflow row. No extra page, no overlay, and the official browser (search, row menu, drag reorder, archive filters) is untouched.

- Five dimensions: **favorites · running · waiting for you · unread completions · recently active**; yellow = waiting for approval/answer, blue = running, green = finished but unread.
- **Every session row carries a ☆** (the official rows included) — one hover-click to favorite, no panel and no drag.
- **Collapse the whole block to one line** when you need the height back, and the choice is remembered.
- The magnifier in the header **searches this section in place**.
- Client-only, no network calls, favorites stay in your browser; disable the plugin to get the official sidebar back.

**Install**

```
Plugins → Discover → Add index source
https://tianxiaz.github.io/dsh-recent-sessions/market/index.json
```

or

```bash
dsh plugin --profile <profile> add "git+https://github.com/tianxiaz/dsh-recent-sessions.git"
```

Market entry: https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
Repository: https://github.com/tianxiaz/dsh-recent-sessions

> ⚠️ Not compatible with the recent-sessions plugin from `huangxp12` / `whybebabo` (panel id conflict) — install one or the other.

---

## 发到哪儿

| 场合 | 用什么 |
|---|---|
| DSH 用户群 / 社区讨论区 | 中文正文 + `social-preview.png` |
| GitHub Discussions / Issue | 英文正文 + 市场条目链接 |
| 掘金 / V2EX / 即刻 / 小红书 | 中文正文 + 整窗图 `preview-desktop-light.png` |
| X / Twitter | 英文一句话 + `social-preview.png` + 仓库链接 |

> 微信/QQ 分享不读 OG 标签，头图由它们自己抓取；其余平台会正确显示社交卡。

---

## 短版（Discord / 群聊 / 即刻 / X，直接复制）

**中文**

> 给 DSH 写了个小插件「最近会话」：像官方「工作区」一样长在左侧栏里的分区 —— 收藏 / 运行中 / 等待你的回应 / 完成未读 / 最近活跃一屏直达。
> 亮点：每个会话行都有 ☆ 一点即收藏；整段可收起到一行；标题右侧就地搜索；官方会话区一行没改。
> 安装：Plugins → Discover → Add index source → `https://tianxiaz.github.io/dsh-recent-sessions/market/index.json`
> 市场条目：https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
> 仓库：https://github.com/tianxiaz/dsh-recent-sessions
> （与 huangxp12 / whybebabo 的最近会话插件互斥，二选一）

**English**

> Built a small DSH plugin: **Recent Sessions** — a section in the left sidebar built on the official Workspaces grid (favorites / running / waiting-for-you / unread / recently active).
> Highlights: a one-click ☆ on every session row, collapse the whole block to one line, search in place, official browser untouched.
> Install: Plugins → Discover → Add index source → `https://tianxiaz.github.io/dsh-recent-sessions/market/index.json`
> Market: https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/
> Repo: https://github.com/tianxiaz/dsh-recent-sessions
> (Incompatible with the recent-sessions plugin from huangxp12 / whybebabo — pick one.)

---

## 长版（掘金 / V2EX / 知乎 / 公众号）：建议结构

标题备选：

- 《我给 DSH 左侧栏加了一个「最近会话」，做法是接管官方外壳》
- 《为什么我不做浮层，而是把「最近会话」做成和「工作区」一样的原生分区》
- 《DSH 插件实战：如何复刻官方侧栏的 36/34/32/28 网格》

结构（比广告更吸量的写法）：

1. **问题**：会话一多，"哪个在跑 / 哪个跑完了没看 / 哪个在等我授权"要翻半天；
2. **调研**：看了 5 个同类插件，都是浮层 / 底部列表 / 独立面板 —— 没有一个是"原生分区"；
3. **难点**：DSH 的 `sidebar` 和 `sidebar.workspaces` 都是单占位槽，插件插不进去；
4. **做法**：接管外壳、把官方会话区原样嵌回、按官方 CSS 量出 36/34/32/28 的网格；
5. **结果**：截图（整窗图 + 细节图）+ 五个维度 + 每行 ☆ + 收起到一行 + 就地搜索；
6. **代价与边界**：接管外壳意味着官方侧栏更新要跟；禁用即回退；
7. **安装**：索引源地址 / git 命令。

配图：`docs/preview-desktop-light.png`（首图）、`docs/preview-light.png`（细节）、`docs/social-preview.png`（分享卡）。

---

## 渠道清单

| 渠道 | 语言 | 用什么 |
|---|---|---|
| [DSH 官方 Discord](https://discord.gg/4MrtZUhpxg) | 英文 | 短版英文 + `social-preview.png`（找 `#plugins` / `#showcase` 类频道） |
| [awesome-dsh-plugin Discussions](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/discussions) | 英文 | 短版英文（合并后再发，链接更完整） |
| [V2EX · 分享创造](https://www.v2ex.com/go/create) | 中文 | 短版中文 + 整窗图 |
| 掘金 | 中文 | 长版（技术向，讲"接管外壳 + 复刻网格"） |
| 即刻 / 小红书 | 中文 | 短版中文 + 整窗图（小红书建议 3:4 竖版裁图） |
| 知乎 | 中文 | 长版（自问自答式） |
| 公众号 | 中文 | 长版改写成故事 + 图 |
| X / Twitter | 英文 | 短版英文 + `social-preview.png` |
| 你自己的 DSH 群 | 中文 | 短版中文 |

**时机**：等社区市场 PR 合并后再集中发一轮，链接能直接落到市场条目；同一天发完，别拖成"几个月前的插件"。
