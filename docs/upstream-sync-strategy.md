# 上游同步策略

## 基线

- **基线 commit**：`1b8ecd9` — `feat: add design baseline and polish source settings`
- **锁定日期**：2026-07-03
- **上游仓库**：`KuekHaoYang/KVideo`（分支 `main`）

自本 commit 起，停止对上游的自动全量合并，改为"锁定基线 + 选择性 cherry-pick"。

## 为什么停自动合并

此前 `.github/workflows/Github_Upstream_Sync.yml` 每 6 小时自动合并上游 `main`，带来两个问题：

1. 改造期间（安全加固、双轨收敛、设计系统硬化等）上游变更持续冲入，造成冲突爆炸。
2. 为回避冲突，二开倾向于"叠加新文件"而非修改上游热点文件，由此积累了一批复制粘贴债（如普通/premium 双轨 store、两套 fetch 基础设施）。

改为手动选择性同步后，二开可以自由修改原文件，从根源上消除"避冲突复制"。

## 手动同步方式

### 方式一：GitHub Actions 手动触发

在仓库 Actions 页面选择 `Upstream Sync` workflow，点击 `Run workflow`。该 workflow 会尝试合并上游 `main`；若冲突，会强推到 `upstream-sync-conflict` 分支并开 PR，由人工评审后合并。

> 仅在评估完上游变更、确认无冲突或冲突可接受时才手动触发。

### 方式二：本地选择性 cherry-pick（推荐）

针对上游个别有价值的提交，按需引入：

```bash
# 一次性添加上游远端
git remote add upstream https://github.com/KuekHaoYang/KVideo.git
git fetch upstream

# 查看上游新增提交
git log --oneline HEAD..upstream/main

# 选择性引入某个提交
git cherry-pick <commit-sha>
```

## cherry-pick 评审清单

引入上游提交前，逐项确认：

- [ ] **价值**：修复了 bug 或带来了需要的功能？还是可以暂时不要？
- [ ] **冲突**：是否触碰二开已改动的文件？若冲突，二开侧改动优先保留。
- [ ] **安全**：是否引入新的代理/抓取/鉴权相关改动？若是，需结合安全加固成果复核。
- [ ] **依赖**：是否引入新依赖或升级版本？是否影响 Docker / Edge 双部署目标？
- [ ] **可回滚**：cherry-pick 后能否干净 revert？保留 commit sha 以备回滚。

## 冲突处理约定

- 普通合并冲突：**二开侧改动优先**，上游纯新增可采纳。
- 安全 / 鉴权 / 代理相关冲突：以二开侧（已加固）为准，不接受上游回退安全策略。
- premium 双轨相关：合并由双轨收敛工作统一处理，不接受上游对 premium 侧的散乱改动。

## 已知债务（CI）

CI 当前策略（见 `.github/workflows/ci.yml`）：

- 硬卡：`npx tsc --noEmit`、`npm test`
- 软卡（`continue-on-error`）：`npm run lint` —— 基线存在历史遗留 `any`（约 153 errors），待类型治理完成后改为硬卡。

新增代码应尽量满足 lint（尤其是非 `any` 类规则），避免债务继续扩大。

## 分支保护建议（平台侧配置）

在 GitHub 仓库 Settings → Branches → `main` protection 配置：

- Require status checks to pass：勾选 `Lint / Typecheck / Test`（CI job）
- Require pull request before merging
- 限制 force-push
