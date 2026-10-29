# Obsidian 子项目治理文档

ARA 文档入口；结构与流程随子仓库跟踪，日常 trace 与个人 AGENTS 保持本地。
插件使用说明仍在 ../README.md。

<!-- ara-docs:begin -->
<!-- ara-docs:source-sha256=5ac2df69f01ede878555f76aff3c094046dd3d191513eb6887a2795200ce8a3b -->

> 自动生成：只修改 ara.yaml 的 documentation / workflows，再运行 render-docs --write。

## 1. 分类与放置

| 类别 | 判据与位置 |
|---|---|
| ops | Maintained engine synchronization procedures in docs/ops/. |
| plans | Proposed implementation and migration plans in docs/plans/. |
| records | Immutable dated snapshots in docs/records/. |

### 命名

| 类别 | 文件名 |
|---|---|
| ops | VERB_OBJECT_RUNBOOK.md |
| plans | YYYY-MM-DD-topic.md |
| records | topic_YYYY-MM-DD.md |

## 2. 任务 → 按顺序读取

| 登记 ID | 做什么时参考 | 读取顺序 |
|---|---|---|
| workflow.sync_shared_engine | 母库共享包或工具链更新后刷新插件固定版本并检查兼容时 | [docs/ops/SYNC_SHARED_ENGINE_RUNBOOK.md](<ops/SYNC_SHARED_ENGINE_RUNBOOK.md>) → [engine.json](<../engine.json>) → [README.md](<../README.md>) → [TESTING.md](<../TESTING.md>) |
| read.repository_submodule | 评估或实施正式 Obsidian 插件独立仓库及父库 submodule 集成时 | [docs/plans/2026-10-29-repository-submodule.md](<plans/2026-10-29-repository-submodule.md>) → [README.md](<../README.md>) → [TESTING.md](<../TESTING.md>) |

<!-- ara-docs:block-sha256=bfeec8a34556f11ea19aee7623dae5b6d61c41e86e0cb794453670bb0f0aa6a6 -->
<!-- ara-docs:end -->
