# HANDOFF（上下文交接物）

> 本文件由 `context-handoff` 技能维护。节名、子项名、顺序固定；改动后必须过
> `node /Users/zhangtianxiang/.dsh/skills/context-handoff/scripts/check_handoff.mjs check <本文件>`。

<!-- handoff:provenance -->
version: 1
round: 5
updated_utc: 20261113T0830Z
workspace: /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions
trigger: user-request
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
- 已完成：0.2.7 修复（`ead2b09`）——归档「还有工作」的会话只报错、没有出口。宿主以 `WorkspaceArchiveError` + `rpcError.code === 'workspace/session-active'` 拒绝，实际活动在 `rpcError.details.activity`（`turn`/`subagent`/`job`/`schedule`）。0.2.6 按行状态猜，猜不到 schedule。现在按契约解析并弹「停止并归档此会话？」，列出将被停止的工作，确认后走 `archiveSession(…,{stopActivity:true})`；忙碌拒绝不再冒充错误，真正的失败仍显示原因。
- 已完成：0.2.6 修复（`aaf36a4`）——行内归档没反应：`archiveSession` 从未从 props 绑定（第三次同类：0.2.3 `renameSession`、0.2.4 外壳）。动作层改为读宿主返回值并核实归档集合；所有动作失败在侧栏/面板底部显示一行原因。
- 已完成：0.2.5 修复（`4b3c661`）——重命名没反应：未 inject `sessions`，`ctx.sessions` 未注入即抛错；改 `inject` + `ctx.get('sessions')`，失败原因显示在对话框。
- 已完成：0.2.4 修复（`be50416`）——整列崩溃（`renameSession` 未解构）。
- 已完成：`npm run smoke`——离屏渲染外壳 / 行内分区 / 行菜单 / 重命名与归档确认两个弹窗 / 面板页；按下每个交互处理器；驱动真实动作层（忙碌拒绝须带 activity 且不弹错误行、普通失败须弹、确认框须列出定时提醒、注入列表须含 `sessions`）。对 0.2.5 的 `client.js` 实测 8 条失败（含 `archiveSession is not defined`）。
- 已完成：`npm run market:merge`——合并旧版本 + 倒序 + `parseMarketIndex` 校验，版本数变少即拒绝写入。本次 18 个版本（0.2.7 … 0.1.0）。
- 进行中：无。
- 阻塞：`dsh-project-board` 重复声明子槽 `sidebar.workspaces.session.menu.item`，抛 `already declared`，连带 `ui-workspace` 未挂完 → 侧栏「工作区」可能仍空白。该项由另一个会话负责修，本会话不动它；本插件故障均已证明与它无关。
- 待办：①0.2.7 真实 UI 验证（忙碌会话归档应弹「停止并归档」并列出定时提醒；确认后行消失）；②面板 v1.1（多选批量归档 + 键盘 ↑↓/Enter/A/F//）未开始；③`en` 词典缺 9 个 `page.*` 键；④小红书「用法」帖是否已发未确认；⑤掘金标题+封面改写已判定暂停。
- 下一步：等用户回 0.2.7 的 UI 结果（忙碌会话归档应弹确认并列出如「1 条定时提醒：…」；确认后停止并归档）。
- 验证：`npm run smoke` 必须 exit 0；`node /Users/zhangtianxiang/.dsh/skills/context-handoff/scripts/check_handoff.mjs check docs/HANDOFF.md` 必须 exit 0；`curl -s "https://tianxiaz.github.io/dsh-recent-sessions/market/index.json?v=$(date +%s)"` 首项应为 0.2.7。
- 恢复检查点：代码基线 HEAD=`ead2b09`（0.2.7 发版提交，工作树干净）；其后只有 market 索引与 docs 提交，代码无变化 —— 新会话核对时，只要 `git log` 里 `ead2b09` 之后只有 market/docs 提交、且 `git status --short` 为空，即为一致。
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
- 决定：发 0.2.3 时只做了组件级离屏渲染（`/tmp/harness5.mjs` 直接渲染 `RecentInlineGroup`），没有渲染外壳，于是"props 传了没解构"从头到尾没被跑到。**今后发版前跑 `npm run smoke`，它渲染 `SidebarShell`，这条路径能抓到这个 bug。**
- 决定：**宿主的拒绝要按契约解析，不要靠猜状态**。0.2.6 用 `row.state` 猜「是否忙碌」，漏掉了 schedule 这类活动；正解是读 `WorkspaceArchiveError.rpcError.{code,details.activity}`，官方 `activeSessionRefusal` 就是这个写法。
- 决定：**同一类 bug 出现三次就封口**。「props 传了没解构」在 0.2.3（`renameSession`）、0.2.4（外壳）、0.2.6（`archiveSession`）各炸一次，说明靠肉眼和单点测试不够。现在 `npm run smoke` 会按下每个按钮、并驱动真实动作层；再出现这类问题会先在建好的测试里失败。
- 决定：宿主控制器用返回值表达拒绝（`{ok:false,error}`），不是抛异常。任何包装器必须同时读返回值和兜异常，否则"点了没反应"就是必然结果。
- 决定：插件要读的每个服务都必须写进 `inject`（`sessions` 就漏在这里），并且用 `ctx.get(name)` 取——官方 `ui-workspace`/`ui-agent-preset` 都是这个口径。判空 return 只能防崩，不能当功能实现。
- 决定：失败必须回到界面上。凡是用户点了之后"没反应"的动作，都要在弹窗/行内留下可见结果，Console 只作复盘用。
- 决定：把"合并旧版本 + 校验"从口头铁律固化成 `scripts/merge-market-history.mjs`，因为 `make-market-index.mjs` 只会产出单版本索引，靠人记得合并不可靠。
<!-- /handoff:section -->

<!-- handoff:section id=todo -->
- 待办：①0.2.7 真实 UI 验证（忙碌会话归档应弹「停止并归档」并列出定时提醒；确认后行消失）；②面板 v1.1（多选批量归档 + 键盘 ↑↓/Enter/A/F//）未开始；③`en` 词典缺 9 个 `page.*` 键；④小红书「用法」帖是否已发未确认；⑤掘金标题+封面改写已判定暂停。
<!-- /handoff:section -->

<!-- handoff:section id=boundaries -->
- 可改：本仓库 `client.js`、`package.json`、`CHANGELOG.md`、`README*.md`、`market/index.json`、`scripts/*`、`docs/*`。
- 禁止：不要写 `~/.dsh/profiles/web/*`（root 无写权限，实测 `touch` 被拒）；不要动 `dsh-project-board` 与 `ui-workspace` 的冲突代码（另一个会话负责）；不要在没有合并旧版本的情况下覆盖 `market/index.json`；不要改分区行的交互语义（悬停换准星、右侧锚定、单指示器）。
- 归属未定：`dsh-better-sidebar`（0.28.2）与本插件是否长期共存；面板 v1.1 是否纳入 0.3.0。
<!-- /handoff:section -->

<!-- handoff:section id=environment -->
- 路径：仓库 `/Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions`；市场索引 `market/index.json`；Pages 根 `https://tianxiaz.github.io/dsh-recent-sessions/`。
- 服务：DSH web 由 `dsh-web.service` 托管（`sudo systemctl restart dsh-web.service` 会打断当前会话）；Pages 每次推送后约 1 分钟生效、CDN 缓存约 10 分钟。Web 配置 `~/.dsh/profiles/web/package.json` 里本插件是 `link:` 到本仓库，所以本机验证走的是工作树代码。
- 命令：`npm run smoke`（发版前必跑）；`node scripts/make-market-index.mjs --source git --repo https://github.com/tianxiaz/dsh-recent-sessions --commit "$(git rev-parse HEAD)" --homepage https://github.com/tianxiaz/dsh-recent-sessions --out market/index.json && npm run market:merge`（合并 + 校验一步到位）；推送需 `export GIT_SSH_COMMAND=/Users/zhangtianxiang/Documents/dsh/.tmp/git-ssh/ssh-wrap`。
- 依赖状态：`node --check client.js` 可用；`parseMarketIndex` 不在本仓库依赖里，`merge-market-history.mjs` 会依次尝试裸导入、`DSH_MARKET_INDEX_MODULE`、`<node 前缀>/lib/node_modules/@deepseek-ai/{dsh-plugin-market-index, dsh/node_modules/@deepseek-ai/dsh-plugin-market-index}`。
<!-- /handoff:section -->

<!-- handoff:section id=evidence -->
- 提交：`c34f5db` market 0.2.7（18 版本）、`ead2b09` 0.2.7 修复（拒绝契约 + 停止并归档）、`8b8549f` market 0.2.6（17 版本）、`aaf36a4` 0.2.6 修复（归档绑定 + 动作层可见失败 + 按钮走查测试）、`4b3c661` 0.2.5 修复（sessions 注入 + 失败可见）、`be50416` 0.2.4 修复 + smoke + merge 脚本、`938ea33` market 0.2.4（15 版本）、`6eb243f`/`16404df` docs（上一轮交接）、`66381e3` market 修复（14 版本）、`cd1f19c` 误删索引版本、`130705a` 0.2.3 发版、`00d9081` 0.2.2、`357e9f9` 0.2.1。
- 文件：`client.js`（菜单 `RowMenu`、重命名 `renameSession` + `RenameDialog`、外壳 `SidebarShell` 第 ~2843 行解构）、`scripts/smoke-render.mjs`、`scripts/merge-market-history.mjs`、`market/index.json`、`docs/HANDOFF.md`。
- 实测数字：`npm run smoke` 对 0.2.3 的 `client.js` exit 1（`SidebarShell threw at render: renameSession is not defined`），对 0.2.4 exit 0；`buildGroups(539 会话) ≈ 1.3–3.0 ms`；GitHub star 3、fork 0、issue 0（11-13）；掘金阅读 26（72h）、赞 0、评论 2；小红书（11-10）赞 26 / 收藏 29 / 评论 11；市场索引 18 个版本（0.2.7 … 0.1.0），`parseMarketIndex` 通过；`npm run smoke` 对 0.2.5 的 `client.js` 输出 8 条失败、对当前代码 exit 0；实测报障原文：`workspace/session-active: … the session is active (schedule)`。
<!-- /handoff:section -->

<!-- handoff:section id=open_questions -->
- 待裁决：0.2.7 的「停止并归档」在真实 UI 是否生效（0.2.6 已把归档失败从「没反应」变成可见报错，用户据此报出了 `workspace/session-active`）；小红书「用法」帖是否已发布；面板 v1.1 是否排进 0.3.0；推广是否继续只押小红书。
<!-- /handoff:section -->
