# 新会话开场指令（直接整段复制发送）

我正在接续维护 DSH 插件 `dsh-recent-sessions`。

请先读这个交接物，再动手：
`/Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions/docs/HANDOFF.md`

按其中 `status.下一步` 那一节执行：先核对基线
（`cd /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions && git rev-parse HEAD`
应为 `66381e3b3369af9bfb3a875fe1ea4d4fb2ee6dfe`，工作树干净），
然后向我要 0.2.3 的 UI 验证结果（行内「⋯」菜单是否全中文、重命名是否生效）。

本项目的铁律（三条，不许违背）：
1. 发版必须先合并旧版本再写 `market/index.json`：`make-market-index.mjs` 产出后，把上一版索引里的旧版本追加回去，再跑 `parseMarketIndex` 校验，最后才推送。
2. 我（用户）只接受"原生感"的 UI：对齐官方行、单一指示器、悬停不位移；改动前先看官方 `@deepseek-ai/dsh-client-ui-workspace` 的 CSS 口径。
3. 不要碰 `~/.dsh/profiles/web/*`（无写权限），也不要动 `dsh-project-board` —— 那个子槽冲突由另一个会话修。

改完插件给我一句可粘贴的验证步骤，不要只说"好了"。
