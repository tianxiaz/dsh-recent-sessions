# 发布指引 · Publishing dsh-recent-sessions

> TL;DR (English): push this directory to GitHub (or publish to npm), generate `market/index.json` with `npm run market -- --source git --repo <url> --commit <sha>`, serve that folder over https (GitHub Pages / raw), then add the URL as an index source in DSH **Plugins → Discover** and install from the card.

本指引按「从零到装进别人 DSH」的顺序写，命令都可以直接复制。两种发布渠道任选其一：

- **路线 A（推荐）**：GitHub 仓库 + 官方插件市场索引 —— 不需要 npm 账号；
- **路线 B**：npm 包 + 同一个索引 —— 需要 npm 账号；
- **路线 C**：社区市场（可选，额外曝光）。

---

## 0. 前置

| 需要什么 | 路线 A | 路线 B |
|---|---|---|
| GitHub 账号 | ✅ | 可选（托管索引仍需要静态托管） |
| npm 账号 | ❌ | ✅ |
| 一个静态 URL 托管 `market/` | GitHub Pages 或 raw | 同左 |

仓库位置：`plugins/dsh-recent-sessions`（本身已是 git 仓库，分支 `master`，提交 `486b580`，v0.1.0）。

---

## 1. 发布前检查（30 秒）

```bash
cd /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions

node --check client.js                     # 客户端半可解析
node -e "console.log(require('./package.json').version)"   # 应为 0.1.0
npm pack --dry-run --cache /tmp/dsh-npm-cache   # 看到 11 个文件、约 25 kB
npm run market -- --source git --repo https://github.com/OWNER/REPO \
  --commit 0123456789abcdef0123456789abcdef01234567 --validate
                                           # 索引可生成 + 通过官方格式校验
git status --porcelain                     # 应为空
```

---

## 2. 路线 A：GitHub + 官方 Discover

### A1. 建一个空仓库

GitHub → New repository → 名字建议 **`dsh-recent-sessions`** → **不要**勾选 README / .gitignore / license（本地已有）→ Create。

### A2. 设置 git 身份并推送

```bash
cd /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions

# 这台机器还没配置 git 身份，先设一次（换成你自己的）
git config --global user.name  "你的名字"
git config --global user.email "you@example.com"

git branch -M main                                  # 与 GitHub 默认分支对齐
git remote add origin https://github.com/<owner>/dsh-recent-sessions.git
git push -u origin main
```

> 想用 SSH：`git remote add origin git@github.com:<owner>/dsh-recent-sessions.git`。

### A3. 用真实 commit 生成市场索引

```bash
COMMIT=$(git rev-parse HEAD)
npm run market -- --source git \
  --repo https://github.com/<owner>/dsh-recent-sessions \
  --commit "$COMMIT" \
  --homepage https://github.com/<owner>/dsh-recent-sessions
# 产物：market/index.json（版本 0.1.0，source 固定到上面这个 commit）

npm run market -- --source git \
  --repo https://github.com/<owner>/dsh-recent-sessions \
  --commit "$COMMIT" --validate          # 可选：再跑一次格式校验
```

`market/` 里会有 `index.json` 和 `icon.svg`（图标相对索引解析）。

```bash
git add market && git commit -m "market: index for 0.1.0" && git push
```

### A4. 让索引有 https 地址（二选一）

**GitHub Pages（推荐，返回正确的 `application/json`）**

仓库 → Settings → Pages → Build and deployment：Source = *Deploy from a branch*，Branch = `main` / `/ (root)` → Save。
等 1 分钟，索引 URL 为：

```
https://<owner>.github.io/dsh-recent-sessions/market/index.json
```

**raw（最快，返回 text/plain 也能被解析）**

```
https://raw.githubusercontent.com/<owner>/dsh-recent-sessions/main/market/index.json
```

### A5. 在 DSH 里添加索引源并安装

1. 打开 DSH → **Plugins → Discover**；
2. 空状态点 **Add index source**（或市场菜单最下面的 **Manage index sources…**）；
3. 粘贴 A4 的 URL → 保存（该市场自动成为当前选择）；
4. 卡片出现「最近会话 / Recent Sessions」→ **Install** → 确认信任提示；
5. 装完 **硬刷新页面**（`Cmd + Shift + R`）。

命令行等价物（不经过 Discover）：

```bash
dsh plugin --profile web add "git+https://github.com/<owner>/dsh-recent-sessions.git#<commit>"
```

> `dsh plugin` 会转发给 pnpm，并在安装后自动把声明了 `dsh.bundle` 的包加入 `dsh.profile.bundles`（不是纯依赖）。

### A6. 验收清单

- 左侧栏「新会话」下方出现 **最近会话** 分区（36px 标题 + 分类行 + 会话行 + 溢出行）；
- 分区下方 **工作区** 与官方会话浏览区行为不变（搜索、会话 `…` 菜单、拖拽排序、归档筛选都还在）；
- **Plugins → Installed** 里能看到该 bundle 的图标与中/英文标题；
- 会话行悬停出现 ☆，拖到「收藏」分组能固定；点行能打开会话；
- 禁用该 bundle → 官方侧栏原样回来。

---

## 3. 路线 B：npm 发布

```bash
cd /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions
npm login                   # 或配置 NPM_TOKEN
npm publish                 # 无 scope 的公开包
npm view dsh-recent-sessions version   # 应输出 0.1.0

npm run market -- --source npm --registry https://registry.npmjs.org
```

然后把 `market/` 按 A4 托管，再按 A5 安装；命令行：

```bash
dsh plugin --profile web add dsh-recent-sessions
```

---

## 4. 路线 C：社区市场（可选）

你已装的 `dshmarket`（数据源 `awesome-dsh-plugin.com`）是独立社区市场，按它自己的收录流程提交即可；提交时给 **GitHub 仓库地址** 或 **npm 包名**，与路线 A/B 不冲突。

---

## 5. 发下一个版本（0.1.1 起）

```bash
# 1) 改代码后：升版本 + 记 changelog
npm version patch --no-git-tag-version     # 0.1.0 -> 0.1.1
$EDITOR CHANGELOG.md
git add -A && git commit -m "0.1.1: ..." && git push

# 2) 发布渠道
npm publish                                 # 走 npm 的包（若也用 npm）
#   或：git 路线只需上面的 push

# 3) 重生成索引（版本号随 package.json；git 路线用新 commit）
COMMIT=$(git rev-parse HEAD)
npm run market -- --source git \
  --repo https://github.com/<owner>/dsh-recent-sessions --commit "$COMMIT"
#   npm 路线：npm run market -- --source npm
git add market && git commit -m "market: 0.1.1" && git push
```

已有用户：Discover 里点刷新（市场会重读索引）→ 卡片出现新版本 → 安装；或 `dsh plugin --profile web add dsh-recent-sessions@0.1.1`。

> 索引里的 `versions` 数组可保留多个版本；生成器一次写一个，想要历史版本时手动合并数组即可。

---

## 6. 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| Discover 里加源被拒 | 只接受 `https://`，不能带账号密码或 `#fragment`；先用 `--validate` 校验 JSON |
| 卡片可点但装不上，提示版本不兼容 | `engines.dsh` 与当前 DSH 不匹配；确认 DSH 版本，必要时放宽 `engines.dsh`；仅测试时可用 `dsh plugin --profile web allow-version dsh-recent-sessions@0.1.0 --dsh-version <精确版本> --accept-risk` |
| 装完侧栏没变化 | **先硬刷新**；接管需要整页重新加载（页面里已注册的官方外壳无法热卸载） |
| 左侧栏空白 | 插件脚本加载失败或 `sidebar` 注册冲突；看浏览器 Console 是否有 `slot entry already declared` / `slot entry crashed`，并确认 `ui-sidebar` 行确实被本插件的 patch 禁用 |
| git 安装被 pnpm 拦 | 本包无 `prepare` 构建脚本，一般不会；若提示 `allowBuilds`，按提示把 pnpm 打印的 key 加进 profile 的 `pnpm-workspace.yaml` 后重试 |
| 市场里标题/图标不对 | 检查 `locale/zh.json`、`locale/en.json` 与 `market/index.json` 的 title/description/icon 是否一致，重新推送索引后刷新 |

## 7. 卸载与回滚

```bash
dsh plugin --profile web remove dsh-recent-sessions   # 同时从 bundles 移除
```

或在 **Plugins → Installed** 里禁用该 bundle —— 官方左侧栏立刻恢复。
