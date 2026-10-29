# 独立仓库与母库集成记录 — 2026-10-29

- 用户明确授权独立化、方便同步共享引擎，以及使用 gh 创建并上传 GitHub 仓库。
- 仓库：https://github.com/panwanke/markpage-obsidian ，沿用母库 PUBLIC 可见性。
- 源历史从母库 apps/obsidian 提取，提取后目录 tree 与原 main 完全一致；母库不改写历史。
- 母库 apps/obsidian 已转换为 submodule，branch 提示为 main，正常检出仍固定 gitlink。
- core/editor/extension-obsidian 均留在母库，插件不维护共享算法或 UI 的第二份源码。
- engine.json 固定母库 117bc99a64b00c7f6b548152995b8cefa56af84a；本地实际执行
  npm run sync:obsidian，通过 598 测试、lint、类型、架构及插件安装包检查后更新 pin。
- 独立 clone 的 npm run check 会创建受归属/物理路径检查约束的 .markpage/engine
  生成上下文，使用固定母库 lockfile 安装依赖，把当前插件作为构建 overlay。
  这是可删除的构建缓存，不是第二份需要维护的源码。
- Windows C:/D: 重定向场景的脚本入口按 realpath 判断；失败回滚 pin 的测试也通过
  junction/symlink 路径执行，避免同步命令因路径别名静默跳过。
- build-info.json 分别记录插件 sha/dirty 与 engine.sha/version/dirty；插件版本
  只与本仓库 package.json / manifest 一致，不再强制与引擎版本相同。
- 插件 CI 与 tag/draft Release workflow 归子库；母库分别运行网站与递归集成检查。
- 网站无子模块的新 clone：npm ci、typecheck:web、561 tests / 44 files、build 通过。
- 早期固定引擎基线的插件独立 clone：597 tests / 50 files 和插件构建通过；更新至
  上述引擎后集成回归为 598 tests。远端早期 b3ffd9a 和 658fdb2 的插件 CI 已通过。
- CI 发现原有 Bridge 重试测试的约 1 秒等待短于生产 1.5 秒重试；母库 a48c5e0
  仅把该测试改成受控计时器并校验重试边界，生产行为不变。
- ara.yaml、docs 的结构/流程材料随子库跟踪；个人 AGENTS、日常 trace、生成产物、
  合成 Vault、缓存和恢复包不上传。父子项目 slug 与关联不变。
- 未创建发行 tag、未发布正式 Release、未操作用户 Obsidian 或覆盖已有 Vault。
  真实宿主验收与完整 API v2 仍按既有 TESTING.md 待完成。

同步操作的权威入口：../ops/SYNC_SHARED_ENGINE_RUNBOOK.md。
