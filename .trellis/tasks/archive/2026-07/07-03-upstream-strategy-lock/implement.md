# A0 执行计划

## 执行顺序

### 1. 停用上游自动全量合并
- 编辑 `.github/workflows/Github_Upstream_Sync.yml`：移除 `on.schedule` 块（`cron: "0 */6 * * *"`），仅保留 `on.workflow_dispatch`。
- merge / PR-fallback 逻辑保持不变（手动触发时仍可用）。
- 校验：YAML 合法；`on` 下只剩 `workflow_dispatch`。

### 2. 记录基线 + cherry-pick 流程文档
- 新建 `docs/upstream-sync-strategy.md`，内容包括：
  - 基线 commit：`1b8ecd9`（`feat: add design baseline and polish source settings`），锁定日期 2026-07-03。
  - 为什么停自动合并（二开改造期需稳定环境；避免冲突爆炸与"避冲突复制债"）。
  - 手动同步流程：GitHub Actions 页面 dispatch workflow；或本地 `git fetch upstream` + 选择性 `git cherry-pick <sha>`。
  - cherry-pick 评审清单（是否与二开改动冲突、是否值得引入、可回滚）。
  - 冲突处理约定：二开侧改动优先保留，上游纯新增可采纳。
  - 分支保护建议（要求 CI 通过、要求 PR review）。

### 3. 新增 CI 质量门禁
- 新建 `.github/workflows/ci.yml`：
  - 触发：`push`（main）+ `pull_request`。
  - 单 job，`ubuntu-latest`，步骤：`actions/checkout@v4` → `setup-node@v4`（Node 20 LTS，与 Next 16 兼容）→ `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm test`。
  - 失败即阻断（配合分支保护生效）。

## 验证命令

```bash
# YAML 语法校验
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/Github_Upstream_Sync.yml'))"

# 本地基线验证
npm run lint
npx tsc --noEmit
npm test   # 记录现状
```

## 改动文件清单（预期）

- M `.github/workflows/Github_Upstream_Sync.yml`（去 schedule）
- A `.github/workflows/ci.yml`
- A `docs/upstream-sync-strategy.md`

无业务代码改动。

## 回滚点

- 全部为 CI/文档变更，无运行时风险。
- 回滚 = revert 对应 commit 即可恢复自动合并（仅当确认要恢复时）。
