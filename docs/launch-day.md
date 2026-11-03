# 发布日清单（可勾选）

> 目标：PR 合并当天，用最小动作在 4 个渠道发出，链接都落到市场条目；首日把反馈接住。
> 文案全文在 [announce.md](./announce.md)，图在 `docs/`。

---

## T-30 分钟：发布前核对

- [x] 社区市场 PR 已合并：`https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11008` 显示 **Merged**（2026-11-02）
- [x] 网页条目可访问：`https://awesome-dsh-plugin.com/p/tianxiaz/dsh-recent-sessions/`
- [ ] DSH 里「设置 → 插件市场」能搜到 `dsh-recent-sessions`
- [ ] 索引返回 **0.1.2**：`https://tianxiaz.github.io/dsh-recent-sessions/market/index.json`
- [ ] 落地页正常：`https://tianxiaz.github.io/dsh-recent-sessions/`
- [ ] 仓库 About 有描述 / Website / 7 个 topics；Social preview 已上传
- [ ] fork 里那个 `#1` 已关闭
- [ ] 三张图就位：`social-preview.png`、`preview-desktop-light.png`、`preview-light.png`

---

## 发布顺序（建议同一个上午完成）

| 时间 | 渠道 | 形式 | 要点 |
|---|---|---|---|
| T+0 | **DSH 官方 Discord** <https://discord.gg/4MrtZUhpxg> | 英文短版 + 分享卡 | 先进频道列表，挑 `#plugins` / `#showcase` / `#community-showcase` 这类；**不要发 general**；一条消息搞定，别连发 |
| T+5 | **awesome-dsh-plugin Discussions** <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/discussions> | 英文短版 | 选 "Show your plugin" 类分类；标题 `dsh-recent-sessions — Recent sessions on the official Workspaces grid` |
| T+10 | **你的 DSH 群 / 微信群** | 中文短版 + 整窗图 | 先说一句"做了个插件，欢迎试用挑毛病"，比纯广告更容易得到反馈 |
| T+20 | **X / Twitter** | 英文短版 + 分享卡 | 一条推带图 + 仓库链接；标签 `#DeepSeek` `#DSH` `#plugin` |
| T+30 | **即刻** | 中文短版 + 整窗图 | 语气口语化，配图用整窗（信息密度高） |
| 次日 | **V2EX · 分享创造** <https://www.v2ex.com/go/create> | 中文短版 | 标题务实："给 DSH 写了个「最近会话」侧栏插件"；正文别贴大段营销词 |
| 次日 | **掘金** | 长版技术文 | 《我给 DSH 左侧栏加了一个「最近会话」，做法是接管官方外壳》 |
| 第 3 天 | 知乎 / 公众号 | 长版改故事 | 公众号可复用 announce.md 长版结构 |

**发布时统一带**：安装两句（索引源地址 / git 命令）+ 仓库链接 + 分享卡。

---

## 首日回复模板（直接复制改一两个字）

**① "装不上 / 市场里点安装没反应"**

> 索引源要用 https 地址，且不能带 `#`：`https://tianxiaz.github.io/dsh-recent-sessions/market/index.json`。粘贴后回「发现」点右上角刷新；卡片出来再点安装，装完**硬刷新**页面（Cmd+Shift+R）。

**② "装完侧栏没变化"**

> 接管侧栏需要整页重载：硬刷新一次（或新开标签页）。如果侧栏变空，说明加载失败，把 Console 红字发我，我马上看。

**③ "会不会把我官方侧栏改坏 / 能回退吗"**

> 官方会话区（搜索、会话菜单、拖拽排序、归档筛选）一行没改，只是外壳由插件渲染。不想用了：插件管理里禁用 `dsh-recent-sessions`，官方侧栏立刻回来；收藏还在浏览器里，不会丢。

**④ "和别的最近会话插件冲突吗"**

> 会。同类插件如果也接管 `sidebar` 槽或替换官方浏览器，只能二选一。同时装两个会出现侧栏空白或插件不生效，停用一个即可。

**⑤ "收藏存哪儿？换设备会同步吗"**

> 存在当前浏览器 localStorage（三个 key：`dsh.recent-sessions.favorites.v1` / `.inline.open.v1` / `.cats.v1`）。目前不跨设备同步；想要云端同步可以提 issue。

**⑤′ "能不能和 XX 最近会话插件一起装"**

> 不能。它接管的是 `sidebar` 这个单占位槽，且注册的面板 id 是 `recent-sessions`，`huangxp12` / `whybebabo` 的版本用的是同一个 id，同时装会互相顶掉。二选一，禁用其中一个即可。

**⑥ "支持哪个 DSH 版本"**

> `engines.dsh: ^0.2.1-rc.5`。DSH 升级后如果官方侧栏动过，我会同步更新（仓库 README 里有"升级核对清单"）。

---

## 不要做的事

- 不要在同一天往多个群/论坛重复刷同一条；
- 不要去 DSH 官方仓库的 issue 区发广告；
- 不要承诺还没做的功能（云端同步、npm 版、多语言之外的）；
- 不要用"最强 / 最好用"这类词——市场规则和社区都反感。

---

## 24 小时后的复盘（5 分钟）

- [ ] 记录各渠道链接 + 首日数据（star、issue 数、市场条目是否上线）
- [ ] 收集重复出现的问题 → 决定是否发 **0.1.2**（走正常发版流程）
- [ ] 把用户提的好点子记进 issue（别口头答应）
