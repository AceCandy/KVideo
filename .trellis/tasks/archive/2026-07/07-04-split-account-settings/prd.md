# PRD: 拆分 AccountSettings 组件

## 背景
`components/settings/AccountSettings.tsx` 当前 713 行，混合了会话展示、托管账户 CRUD 草稿编辑器、Legacy 兼容账户生成器三类职责，是 settings 模块最大的 god component。可读性、可测试性、改动风险都偏高。

事实依据见 `research/account-settings-structure.md`。

## 目标
按功能区块把 AccountSettings 拆分为一个壳组件 + 多个自包含子组件：
- 壳层只保留会话/模式读取、共享账户数据获取、顶部守卫、子组件组合
- 托管账户草稿编辑逻辑与 UI 下沉到一个 Panel 子组件，状态自包含
- Legacy 兼容账户生成器下沉到另一个 Panel 子组件，状态自包含
- 当前会话卡片、模式横幅各自独立为纯展示子组件

目标行数：壳层约 300 行，最大子组件 < 250 行。

## 范围（本次）
- 混合策略：Managed 块 UI 抽出 + state 留壳（因 fetchAccounts/saveManagedAccounts/effect 强耦合，下沉有行为风险）；Legacy 块整块下沉（状态独立于 fetch/effect，安全）
- 共享类型与工具函数抽到子目录的共享模块
- 详见 design.md 的「核心耦合判断」

## 非目标
- 不抽 custom hook（方案 B 留作后续）
- 不改变任何对外行为（API 调用顺序、错误回显、按钮 disabled 规则、渲染条件）
- 不新增前端表单校验
- 不调整可访问性实现（保持原生表单元素）
- 不重构 PlayerSettings、SettingsSection 等同级组件

## 约束（不可破坏的不变量）
1. 保持 `export function AccountSettings()` 命名导出与文件首行 `'use client'`，调用方 `app/settings/page.tsx` 零改动
2. `saveManagedAccounts` 严格保持 DELETE → POST → PATCH → refetch 顺序
3. PATCH 增量判定（`arraysEqual` + `originalById`）行为不变
4. mount effect（`[]`）与 fetchAccounts effect（`[canManageAccounts, fetchAccounts, loginMode]`）的依赖数组与触发链不变
5. `isCurrentAccount` 守卫（当前账户不能删自己、不能改自己 role）保留
6. `canManageAccounts`（仅 super_admin 可编辑）判定保留
7. 顶部守卫 `if (!hasAuth && !session) return null` 保留在壳层最前
8. 服务端报错 → `saveError` 回显的现行行为不变，不新增客户端校验

## 验收标准
- [ ] `tsc --noEmit` 无新增报错
- [ ] `next build` 通过（edge runtime 不被污染）
- [ ] settings 页面渲染与交互行为与拆分前一致（人工对照：未登录态、super_admin/admin/viewer 三种角色、托管/legacy 两种模式、增删改保存、退出登录）
- [ ] `app/settings/page.tsx` 零改动
- [ ] AccountSettings.tsx 壳层行数显著下降（目标约 150 行）
- [ ] 无任何业务逻辑被改动（仅搬迁）
