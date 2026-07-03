# A0 上游基线锁定与 CI 门禁

## 背景

当前 `.github/workflows/Github_Upstream_Sync.yml` 每 6h 自动合并上游 `KuekHaoYang/KVideo:main` → 本仓 main，冲突时强推到 `upstream-sync-conflict` 分支并开 PR。这种"全量自动合并"会在战役 A/B/C 改造期间持续引入上游变更、造成冲突爆炸，也正是 premium 双轨复制、两套 fetch 基础设施等"避冲突复制债"的根因。

按用户决策②（锁定基线 + 选择性 cherry-pick），本任务先把上游同步策略改为**手动**、记录基线、补 CI 门禁，为后续所有改造解锁稳定环境。本任务是整个战役 A 的前置。

## 范围

1. 停用上游自动全量合并，保留手动触发入口。
2. 记录当前基线 commit。
3. 文档化 cherry-pick 流程。
4. 新增 CI 质量门禁（lint + typecheck + test）。

## 验收标准

- [ ] `Github_Upstream_Sync.yml` 不再每 6h 自动运行；保留 `workflow_dispatch` 手动入口，可手动触发一次性同步。
- [ ] 新建 `docs/upstream-sync-strategy.md`，记录：基线 commit（`1b8ecd9`，含日期与说明）、停自动合并原因、手动同步与 cherry-pick 流程、冲突处理约定（二开侧改动优先）。
- [ ] 新建 `.github/workflows/ci.yml`，在 push 到 main 和 PR 时运行 `npm run lint` + `npx tsc --noEmit` + `npm test`，任一失败阻断合并。
- [ ] 既有 `android-tv-apk.yml` 不受影响。
- [ ] CI 在本地基线验证：`npm run lint` 与 `npx tsc --noEmit` 通过；`npm test` 现状如实记录（若存在既有失败，记为已知问题，不阻断本任务）。

## 不在范围

- 不实际 cherry-pick 任何上游变更（基线 = 当前 HEAD `1b8ecd9`）。
- 不重构任何业务代码。
- 不删除 `upstream-sync-conflict` 分支约定（保留供手动同步使用）。
- 不在 GitHub 侧配置分支保护规则（由用户在平台操作，文档给出建议）。
