# 同步 MarkPage 共享引擎

## 适用范围

母库 packages/* 或工具链有新提交，需要让独立 Obsidian 插件使用该版本并验证兼容。
本流程不发布插件、不修改 Vault，也不自动提交或推送。

## 前提与输入输出

- Node 22.12+ 的 Node 22、npm、Git；可访问两个公开 GitHub 仓库。
- 输入：母库已提交且已推送的 commit SHA，或独立仓库中的远端 ref（默认 main）。
- 权威源：共享代码在母库 packages/*，依赖与工具链锁在母库 package-lock.json。
- 输出：验证通过的 engine.json commit；dist 安装包及两个仓库的来源 SHA。
- 子库不单独运行 npm ci；npm run check/build 自动准备固定引擎上下文和依赖。

## 步骤

1. 在母库完成共享包修改，按项目规则检查、提交并推送。
2. 选择一种入口：

   ```powershell
   # 在母库：默认取当前 HEAD，禁止存在未提交的共享包或根依赖修改。
   npm run sync:obsidian

   # 在独立插件仓库：默认取远端母库 main。
   npm run engine:sync

   # 两种入口均可传入指定母库 ref；完整 SHA 可避免 ref 后续移动。
   npm run engine:sync -- <engine-commit-sha>
   ```

3. 命令运行 lint、架构、类型、全量单元回归和插件构建。失败会恢复原 pin；
   阅读错误输出修复兼容问题，不要跳过门禁。
4. 审阅 engine.json 和插件源码修改，提交到子库 main，再推送子库。
5. 母库确认 apps/obsidian HEAD 正是已推送的子 commit，提交父指针，再推送母库。
6. 需要发行时，在子库单独创建与 manifest.version 相同的 tag，检查 draft Release；
   真实宿主验收仍按 TESTING.md 执行。

## 验收

- engine.json 是完整 40 位母库 SHA，可从母库远端取得。
- 兼容检查通过；插件 dist/build-info.json 有插件 sha 与 engine.sha 两个来源。
- 从独立插件新 clone 运行 npm run check 通过。
- 从母库递归 clone 可运行 npm run validate:all；无子模块的 clone 可构建网站。
- 两库 main 均已推送且干净，父 gitlink 与目标子 commit 一致。

## 故障恢复

- 检查失败：命令自动恢复 engine.json；其他插件修改保留供排查。
- 网络/安装失败：保持旧 pin，修复网络后重跑。缓存是 .markpage/engine 的生成
  上下文，不是另一份权威源码；仅允许脚本在归属与物理路径检查通过后替换 overlay。
- 已提交坏版本：子库恢复上一个 pin 或修复后再检查，推送修复提交，父库更新指针。
- 若父库 gitlink 指向未推送的子 commit，先推送子 commit；不要强制重写父库历史。

## 限制与变体

- 集成环境普通 build 使用母库当前源码；独立 build 使用 engine.json。两者的
  来源写入 build-info，以区分“集成兼容”与“固定版本复现”。
- 指定非当前母库 HEAD 的 ref 时，即使从母库入口执行，也使用隔离的固定版本上下文。
- 插件未脱离共享源码上下文：本仓库不维护共享代码副本或单独的 npm 工具链锁。
- 不做计划任务或自动升级；版本选择与提交均是显式操作。
