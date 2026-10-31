# GitHub / 社区市场 操作清单

> 全部是"点几下"的活；执行完这一页，插件在 GitHub 和两个市场里就都齐了。
> 当前状态：仓库 ✅、索引 ✅、Pages ✅、README 图 ✅、社交卡图 ✅（待上传）。

---

## 1. 仓库 About（Description / Website / Topics）

打开 <https://github.com/tianxiaz/dsh-recent-sessions> → 右侧 **About** → **⚙️**

**Description**（单行，≤350 字符，二选一）

```
像官方「工作区」一样融入 DSH 左侧栏的「最近会话」：收藏 / 运行中 / 等待你的回应 / 完成未读 / 最近活跃一屏直达；每个会话行都有 ☆ 一键收藏，可收起到一行、支持就地搜索，官方会话区完全不变。 | A Workspaces-native Recent sessions section for the DSH left sidebar, with a one-click ☆ on every session row.
```

**Website**

```
https://tianxiaz.github.io/dsh-recent-sessions/
```

**Topics**（逐个输入后回车）

```
dsh-plugin
dsh-bundle
deepseek-harness
deepseek
sidebar
recent-sessions
favorites
```

点 **Save changes**。

命令行等价（已登录 `gh` 的机器）：

```bash
gh repo edit tianxiaz/dsh-recent-sessions \
  --description "像官方「工作区」一样融入 DSH 左侧栏的「最近会话」：收藏 / 运行中 / 等待你的回应 / 完成未读 / 最近活跃一屏直达；每个会话行都有 ☆ 一键收藏，可收起到一行、支持就地搜索。 | A Workspaces-native Recent sessions section for the DSH left sidebar, with a one-click ☆ on every session row." \
  --homepage "https://tianxiaz.github.io/dsh-recent-sessions/" \
  --add-topic dsh-plugin --add-topic dsh-bundle --add-topic deepseek-harness \
  --add-topic deepseek --add-topic sidebar --add-topic recent-sessions --add-topic favorites
```

---

## 2. 社交分享预览（仓库链接在 X / Slack / 飞书里显示的头图）

**Settings** → **General** 拉到最底 **Social preview** → **Edit** → **Upload an image** → 选

```
docs/social-preview.png      (1280×640, 约 176 KB)
```

> 这张图只存在仓库设置里、不进 git；`docs/` 里的文件是源图。

---

## 3. 社区市场（awesome-dsh-plugin.com，8105 个插件）

1. **Fork** <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin>
2. 在你 fork 的仓库里新建一个文件，路径/文件名必须完全一致：

   ```
   data/plugins/tianxiaz__dsh-recent-sessions.yml
   ```

   内容直接复制 [docs/awesome-submission.yml](./awesome-submission.yml)：

   ```yaml
   url: https://github.com/tianxiaz/dsh-recent-sessions
   name: tianxiaz/dsh-recent-sessions
   category: ui
   description:
     en: 'A Workspaces-native Recent sessions section for the DSH left sidebar: favorites, running, waiting-for-you and unread sessions at a glance, with a one-click ☆ on every session row, one-line collapse and in-section search.'
     zh: '像官方「工作区」一样融入左侧栏的「最近会话」分区：收藏、运行中、等待你的回应、完成未读、最近活跃一屏直达；每个会话行 ☆ 一键收藏，可收起到一行、支持就地搜索。'
   icon: https://raw.githubusercontent.com/tianxiaz/dsh-recent-sessions/main/docs/icon-180.png
   ```

   规则要点（来自他们的 contributing.md）：
   - **`description.en` 必填**，中文可选（缺了维护者会补）；
   - 描述里含 `": "`（冒号+空格）**必须加引号**，上面已经加了；
   - `category` 用 `ui`；
   - 仓库的 `package.json` 必须声明 `dsh.bundle` —— 我们已经有（`dsh.bundle.patch` + `dsh.client`），符合要求；
   - `icon` 用 GitHub 托管的位图，我们提供了 `docs/icon-180.png`；
   - **只需这一个文件**，不要改 README（由脚本生成）。

3. 提 **Pull Request**（标题例如 `Add tianxiaz/dsh-recent-sessions`），等合并；合并后列表与站点会自动更新。

---

## 4. 官方 Discover（可选：让索引进入「自己加索引源」之外的分发）

官方 Discover 是"用户自己加索引源"的模型，我们只能提供自己的索引地址（已发布）：

```
https://tianxiaz.github.io/dsh-recent-sessions/market/index.json
```

别人在 **Plugins → Discover → Add index source** 粘贴即可看到卡片。这一步不需要操作，保持索引更新即可（见第 6 节）。

---

## 5. npm 发布（可选，用来占住包名 + 多一条安装渠道）

需要 npm token（Granular/Automation）。在能开浏览器的地方建好 token，然后在服务器：

```bash
cd /Users/zhangtianxiang/Documents/dsh/plugins/dsh-recent-sessions
read -rsp "npm token: " NPM_TOKEN && echo
printf 'registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" > /tmp/npmrc.publish
npm whoami --userconfig /tmp/npmrc.publish
npm publish --userconfig /tmp/npmrc.publish
rm -f /tmp/npmrc.publish
```

发布后可选把索引切成 npm 源（与 git 源二选一）：

```bash
npm run market -- --source npm --registry https://registry.npmjs.org
git add market && git commit -m "market: npm source" && git push
```

---

## 6. 每次发版后（30 秒）

```bash
npm version patch --no-git-tag-version      # 升版本
$EDITOR CHANGELOG.md
git add -A && git commit -m "0.1.2: ..." && git push

COMMIT=$(git rev-parse HEAD)
npm run market -- --source git \
  --repo https://github.com/tianxiaz/dsh-recent-sessions \
  --commit "$COMMIT" --homepage https://github.com/tianxiaz/dsh-recent-sessions
git add market && git commit -m "market: 0.1.2" && git push
```

GitHub Pages 约 1 分钟生效（缓存 10 分钟）；jsDelivr 镜像有约 12 小时分支缓存，必要时 purge。

---

## 7. 完成后自查

- [ ] 仓库 About 有描述、Website、7 个 Topics；
- [ ] Social preview 已上传（分享链接能看到头图）；
- [ ] 落地页 <https://tianxiaz.github.io/dsh-recent-sessions/> 正常；
- [ ] 社区市场 PR 已提交 / 合并；
- [ ] Discover 里 `Add index source` 能拉出卡片并安装；
- [ ] npm 包名（可选）已占。
