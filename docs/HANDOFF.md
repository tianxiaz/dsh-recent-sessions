# HANDOFF（上下文交接物）

> 本文件由 `context-handoff` 技能维护。节名、子项名、顺序固定；改动后必须过
> `node /Users/zhangtianxiang/.dsh/skills/context-handoff/scripts/check_handoff.mjs check <本文件>`。

<!-- handoff:provenance -->
version: 1
round: 1
updated_utc: 20261113T0425Z
workspace: /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions
trigger: degradation
occupancy: unavailable
occupancy_source: unavailable
supersedes: none
status: complete
<!-- /handoff:provenance -->

<!-- handoff:section id=goal -->
- 目标：维护 DSH 插件 `dsh-recent-sessions`（左侧栏「最近会话」分区 + 面板页），并把它持续发布到社区市场（GitHub Pages 索引）。
- 验收：`package.json` 版本号与 `market/index.json` 首项一致、索引 `parseMarketIndex` 校验通过、Pages 返回该版本；用户在 DSH 里硬刷新后能看到分区与面板页。
<!-- /handoff:section -->

<!-- handoff:section id=status -->
- 已完成：0.2.3 已发布并上线（行内 「⋯」菜单文案全部中文化 + 新增「重命名」对话框，走 `ctx.sessions.using(id,{source:'workspaceOperation'},ref=>ref.binding.session.rename(title))`）；市场索引从误删状态修复为 14 个版本（`66381e3`）；Pages 已验证返回 0.2.3。
- 进行中：无。
- 阻塞：`dsh-project-board` 重复声明子槽 `sidebar.workspaces.session.menu.item`，抛 `already declared`，连带 `ui-workspace` 未挂完 → 侧栏「工作区」空白；该项由另一个会话负责修，本会话不动它。
- 待办：①U0.2.3 在真实 UI 验证（菜单中文 + 重命名生效）；②若验证失败，看 Console 的 `recent-sessions: rename failed` 并改用官方行同一引用来源；③面板 v1.1（多选批量归档 + 键盘 ↑↓/Enter/A/F//）未开始；④小红书「用法」帖是否已发未确认；⑤掘金标题+封面改写已判定暂停。
- 下一步：`cd /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions && git log --oneline -3 && node -e "console.log(require('./package.json').version)"` 确认基线后，向用户索取 0.2.3 的 UI 验证结果。
- 验证：`node /Users/zhangtianxiang/.dsh/skills/context-handoff/scripts/check_handoff.mjs check docs/HANDOFF.md` 必须 exit 0；`curl -s "https://tianxiaz.github.io/dsh-recent-sessions/market/index.json?v=$(date +%s)"` 首项应为 0.2.3。
- 恢复检查点：代码基线 HEAD=66381e3b3369af9bfb3a875fe1ea4d4fb2ee6dfe（工作树干净）；本交接物与 OPENING_PROMPT 在该基线之后的一次 docs 提交里（`git log --oneline -3` 可见），代码无变化 —— 新会话核对时，只要 `git log` 里 66381e3 之后只有 docs 提交、且 `git status --short` 为空，即为一致。
<!-- /handoff:section -->

<!-- handoff:section id=decisions -->
- 决定：面板保留并扩成「完整会话台」（全量 + 搜索 + 状态筛选 + 每节 60 条分片），不删除。
- 理由：用户明确要「侧栏太小、面板看全量」；实测 `buildGroups(539 会话) ≈ 1.3–3.0 ms/次`，全量渲染不是性能瓶颈，分片只是保险。
- 已否决：曾建议删除面板页（理由"第三条腿、无独立价值"），被用户以"看全量"需求否掉；今后不再提删除。
- 决定：分区会话行左内边距用官方同款 8px（`padding-inline-start: calc(8px + indent)` 的对齐口径），不再用 20px。
- 理由：20px 使分类行与会话行错位 12px，用户肉眼可见（0.2.1 修复）。
- 决定：吸顶标题用 `top:-1px` + 不透明背景 + 1px 阴影，section 去掉 padding/margin。
- 理由：父级 padding 会让 sticky 偏移，滚动行从缝隙露出（0.2.2 修复）。
- 已否决：用 `visibility:hidden` 占位解决 hover 抖动——用户要求"坑位唯一、顺序不变"，最终改成右侧锚定 + 隐藏控件 `display:none`。
- 尝试过：把「定位」做成常驻按钮（太挤，用户要求改成悬停时状态点换准星）；`revealWorkspace` 曾误插进面板组件导致点击无反应（作用域错误，已修 `2086` 行处为分区内定义）。
- 尝试过：发 0.2.3 时漏掉"把旧版本合并回索引"这一步，导致索引只剩 1 个版本（`cd1f19c`），已用 `git show HEAD~1:market/index.json` 恢复（`66381e3`）。**下次发版必须先合并再校验。**
<!-- /handoff:section -->

<!-- handoff:section id=todo -->
- 待办：①U0.2.3 在真实 UI 验证（菜单中文 + 重命名生效）；②若验证失败，看 Console 的 `recent-sessions: rename failed` 并改用官方行同一引用来源；③面板 v1.1（多选批量归档 + 键盘 ↑↓/Enter/A/F//）未开始；④小红书「用法」帖是否已发未确认；⑤掘金标题+封面改写已判定暂停。
<!-- /handoff:section -->

<!-- handoff:section id=boundaries -->
- 可改：本仓库 `client.js`、`package.json`、`CHANGELOG.md`、`README*.md`、`market/index.json`、`docs/*`。
- 禁止：不要写 `~/.dsh/profiles/web/*`（root 无写权限，实测 `touch` 被拒）；不要动 `dsh-project-board` 与 `ui-workspace` 的冲突代码（另一个会话负责）；不要在没有合并旧版本的情况下覆盖 `market/index.json`；不要改分区行的交互语义（悬停换准星、右侧锚定、单指示器）。
- 归属未定：`dsh-better-sidebar`（0.28.2）与本插件是否长期共存；面板 v1.1 是否纳入 0.3.0。
<!-- /handoff:section -->

<!-- handoff:section id=environment -->
- 路径：仓库 `/Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions`；市场索引 `market/index.json`；Pages 根 `https://tianxiaz.github.io/dsh-recent-sessions/`。
- 服务：DSH web 由 `dsh-web.service` 托管（`sudo systemctl restart dsh-web.service` 会打断当前会话）；Pages 每次推送后约 1 分钟生效、CDN 缓存约 10 分钟。
- 命令：`cd /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions && node scripts/make-market-index.mjs --source git --repo https://github.com/tianxiaz/dsh-recent-sessions --commit "$(git rev-parse HEAD)" --homepage https://github.com/tianxiaz/dsh-recent-sessions --out market/index.json`；推送需 `export GIT_SSH_COMMAND=/Users/zhangtianxiang/Documents/dsh/.tmp/git-ssh/ssh-wrap`。
- 依赖状态：`node --check client.js` 与 `/tmp/harness.mjs`、`/tmp/harness2.mjs`、`/tmp/harness5.mjs` 三个离屏渲染夹具可用于无浏览器验证（`/tmp` 重启后可能已清除，届时按需重建）。
<!-- /handoff:section -->

<!-- handoff:section id=evidence -->
- 提交：`66381e3` market 修复（14 版本）、`cd1f19c` 误删索引版本、`130705a` 0.2.3 发版、`00d9081` 0.2.2、`357e9f9` 0.2.1。
- 文件：`client.js`（菜单在 `RowMenu`，重命名在 `renameSession` + `RenameDialog`）、`market/index.json`、`docs/HANDOFF.md`、`docs/xiaohongshu-usage*.png`、`docs/promotion-tracker.md`。
- 实测数字：`buildGroups(539 会话) ≈ 1.3–3.0 ms`；GitHub star 3、fork 0、issue 0（11-13）；掘金阅读 26（72h）、赞 0、评论 2；小红书（11-10）赞 26 / 收藏 29 / 评论 11；市场索引 14 个版本，Pages 首项 0.2.3。
<!-- /handoff:section -->

<!-- handoff:section id=open_questions -->
- 待裁决：0.2.3 的重命名在真实 UI 是否生效（未验证）；小红书「用法」帖是否已发布；面板 v1.1 是否排进 0.3.0；推广是否继续只押小红书。
<!-- /handoff:section -->
