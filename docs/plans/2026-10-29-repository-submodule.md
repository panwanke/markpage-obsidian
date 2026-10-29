# Obsidian 独立仓库与 submodule 迁移评估

Date: 2026-10-29
Status: implementation — 用户已授权创建并上传独立仓库，按第一阶段实施。
Owner: project-markpage-obsidian
Parent: project-markpage

以下为迁移前评估与实施依据；当前同步操作规范见
[同步引擎 runbook](../ops/SYNC_SHARED_ENGINE_RUNBOOK.md)。共享代码保持母库单源，
独立构建按 engine.json 固定母库上下文，engine:sync 通过兼容检查后才更新 pin。

## 结论与边界

建议把正式宿主 `apps/obsidian/` 独立为 GitHub 仓库，再以同路径 submodule 接回
MarkPage。候选名称为 `panwanke/markpage-obsidian`，名称、可见性和创建均未执行。
独立仓库根目录自然拥有插件 README、manifest 和 Releases，适合独立说明与发行。
Git 拆分与独立构建是两个交付目标；只转换 submodule 不会自动解除 npm workspace
和相对路径耦合。

本轮保持两个公开主库 README 的内容及全部产品源码不变。迁移计划归本子项目
ARA，父 ARA 只登记读取指针。迁移实施时，主库说明只保留必要入口和准确的构建
指令，插件使用、安装、兼容性和发布说明由子仓库维护。

## 源码与治理归属

| 内容 | 建议归属 | 理由 |
| --- | --- | --- |
| apps/obsidian 的宿主、安装/回退、插件说明、测试 | 子仓库根目录 | Obsidian 专属适配与发行 |
| packages/core、packages/editor | 主库 | 网页和宿主共享唯一实现 |
| packages/extension-obsidian | 主库 | 网页也消费其方言与双链能力 |
| obsidian-plugin | 主库，另行评估 | 旧 MarkPage Bridge，不能与正式宿主混为一次迁移 |
| tools/obsidian-probe | 主库，另行评估 | 兼容性诊断工具，本轮不扩大迁移范围 |
| 插件专用 fixtures、插件发布 workflow | 随子仓库迁移或显式声明来源 | 子仓库发行需要可重现输入 |
| 子 ara.yaml / trace / AGENTS / 本计划 | 子 ARA | 保留 project-markpage-obsidian 与父关联 |
| 父 ara.yaml / trace | 父 ARA | 记录集成版本、跨仓协议和父级任务 |

## 已确认的迁移障碍

1. 根 package.json 的 workspaces 包含 apps/*，子 package.json 的三个
   @markpage 依赖均为 1.2.0。三个共享包 private=true，当前靠根安装自动链接，
   尚无独立获取契约；单独 clone 插件后 npm ci 不能被假定可用。
2. build.mjs 从 ../../ 读取根 package.json、LICENSE 和 Git SHA，并要求插件
   manifest 与根产品版本相同。validate-artifact.mjs 也读根版本，且假定
   dependency-report 的输入路径是 packages/*/src。拆分后必须定义插件 SHA、
   引擎 SHA、各自版本与 dirty 状态，不能用一个父 SHA 冒充插件来源。
3. src/styles.css 直接引用 ../../../packages/editor/src/styles.css；preview
   引用主库 fixtures。prepare.mjs 也从父 tests/fixtures 读取合成库。
4. 插件测试从根 cwd 读取 apps/obsidian/src/styles.css，并依赖根 Vitest/Vite、
   TypeScript 和开发依赖。子 package.json 没有独立工具链、scripts 或 lockfile。
5. 主库 npm run build、typecheck、test:contracts、validate:all 和架构检查都
   涉及插件。deploy.yml 同时构建网站与插件；当前 checkout 没有启用 submodules。
   转换后普通 clone 会缺少子源码，直接沿用 CI 会失败。
6. release-obsidian.yml 在主库按主产品 tag 发插件 draft Release；子库发行需
   移交 workflow、以子 manifest 版本为准并上传 main.js / manifest.json /
   styles.css，处理 versions.json、许可及校验和。不要让两仓同时对外发布同一插件。
7. 当前 .gitignore 将 ara.yaml、trace/、docs/、AGENTS.md 等排除在 Git 外。
   git subtree/filter 类提取不会带走这些本地材料。迁移需显式复制、校验并决定
   子库是否跟踪治理文件；勿把测试 Vault、data.json、缓存、凭据或恢复包一起发布。
8. 主库 README 已有旧的“完整宿主待实现”和新的“候选可用”两段并存。
   submodule 不会自动纠正文案；后续迁移应做必要的事实同步，本轮不修改。

## 推荐的分阶段实现

### 第一阶段：独立历史与发行，保留共享构建上下文

先保证仓库与发行边界清楚，避免同时引入共享包发布系统。

1. 从清洁 main 固定基准。对 apps/obsidian 做历史提取，在临时独立目录检查
   子仓库树、许可证和历史，不改写主库历史。当前历史含旧 stage12 的替代实现，
   提取工具必须以最终 main 的目录树为准，不能把旧快照当成目标版本。
2. 为子库增加自身 LICENSE、构建/测试/发布配置、fixture 来源和 ARA 材料。
   保持 manifest.id=markpage，沿用原安装数据位置；独立仓库名称不等于插件 ID。
3. 初期仍在完整主库的 apps/obsidian 路径构建。子 CI 以配置中固定的主库 SHA
   检出引擎上下文，关闭其 submodule 递归，再检出当前子 SHA 到 apps/obsidian，
   最后在主库根 npm ci 与构建。明确文档中的引导入口和锁文件权威。
   此阶段实现独立 Git/Release，尚不承诺裸 clone 子库即可构建。
4. 子库先提交并推送可取用的 commit；主库才将原目录替换为该 commit 的
   gitlink，添加 .gitmodules。保持 apps/obsidian 路径以减少现有工具改动。
5. 主库 CI 增加递归检出。网站专用安装/构建与插件集成门禁分离；如果要求
   不检出子模块也能构建网站，需要同时处理根 lockfile、workspace 配置、
   TypeScript 和测试扫描，不能只把 build 换成 build:web。
6. 从全新 clone 验证父库网站、完整集成和子库发行三条路径，然后才更新指针。
   子库依赖父库是固定版本的构建输入，禁止反向添加父库 submodule 造成循环。

### 第二阶段：独立依赖与工具链

确有独立开发需求时，再为共享包建立带版本和校验的可获取产物（例如 npm 包或
固定 SHA 的归档包）、公共样式入口、子 lockfile 与子测试配置；同时调整主库
“共享包必须 private”的架构规则。替换所有父目录隐式读取，拆开插件与引擎
版本，并让插件从自身根 npm ci / build / test 可用。共享实现继续只有一份。

## submodule 日常约束

- 主库 gitlink 固定子 commit，不会自动追踪子 main 的最新内容。
- 子库先提交并推送，再在父库提交指针；否则其他机器无法重现。
- 父库显示子模块 modified 时检查子库内容与 HEAD，不能通过忽略 dirty 掩盖。
- 子模块普通检出可能 detached HEAD；开始开发前切到有名分支。
- 工作树与 submodule 是不同概念：增加子模块后仍可只有一个主工作树。
- 父库和子库各自一条 main。父库只保存子版本指针，不保存子文件的重复副本。

## 验收与恢复

实施验收：新机器递归 clone 后 npm ci 与完整检查通过；网站构建有明确的最小
输入；子库 CI 使用固定引擎 SHA；Release 文件、插件 ID、版本与校验和正确；
构建来源能定位两个仓库；两级 Git 都干净；ARA 父子路由与状态可读；真实宿主
保存、冲突、恢复和卸载仍需按 TESTING.md 另行验收。

恢复按提交回退：先恢复父库原普通目录与配置，再核对 tree、构建和治理材料。
保留拆分前的父 SHA、子历史提取结果和本地 ARA 备份。不得以 git clean -fdx
清理项目，因为它会删除被忽略的治理材料和本地证据。

## 证据与官方依据

- 当前源码基线：bcfc524；历史归档合并：fbcd740（产品树完全一致）。
- 本轮自动检查：595 tests / 49 files、lint、architecture、typecheck、双端
  build、artifact validator 全通过；Node 25.2.1 / npm 11.12.1，未新增真实宿主证据。
- [Git submodule 模型](https://git-scm.com/docs/gitsubmodules)：独立历史及父库固定 gitlink。
- [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/)：根安装链接本地包。
- [Obsidian 插件提交](https://docs.obsidian.md/plugins/releasing/submit-plugin)：仓库根 README / LICENSE / manifest，Release tag 与插件版本一致及安装附件。
