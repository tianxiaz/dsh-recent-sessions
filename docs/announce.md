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

仓库：https://github.com/tianxiaz/dsh-recent-sessions

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

Repository: https://github.com/tianxiaz/dsh-recent-sessions

---

## 发到哪儿

| 场合 | 用什么 |
|---|---|
| DSH 用户群 / 社区讨论区 | 中文正文 + `social-preview.png` |
| GitHub Discussions / Issue | 英文正文 + 仓库链接 |
| 掘金 / V2EX / 即刻 / 小红书 | 中文正文 + 整窗图 `preview-desktop-light.png` |
| X / Twitter | 英文一句话 + `social-preview.png` + 仓库链接 |

> 微信/QQ 分享不读 OG 标签，头图由它们自己抓取；其余平台会正确显示社交卡。
