# Design: 拆分 AccountSettings 组件

依据：`research/account-settings-structure.md` + 全文通读 `AccountSettings.tsx`（713 行）

## 核心耦合判断（决定拆分形态）

通读全文后发现一处关键耦合，决定本次采用**混合策略**而非对称拆分：

- `fetchAccounts`（:99-122）在壳层被两个 effect 依赖（:124 mount、:138 `[canManageAccounts, fetchAccounts, loginMode]`）。research 明确警告：**禁止拆散这两个 effect 或改 fetchAccounts 依赖**。
- `fetchAccounts` 内部同时执行 `setAccounts(...)` **和** `setDraftAccounts(buildEditableAccounts(...))`（:114-115），并且写入 `saveError`（:103/:118）。
- 因此 Managed 草稿状态（draftAccounts / saveError / saveSuccess / isDirty / isSaving）与壳层 fetchAccounts **强耦合**，下沉必须拆 fetchAccounts 并处理 saveError 归属，引入行为风险。

而 Legacy 状态（`showLegacyConfig` / `legacyEntries` / `generatedLegacyAccounts`）**完全独立**于 fetch/effect/accounts 写入，是纯前端表单状态，可安全整体下沉。

## 拆分形态（混合策略）

```
AccountSettings.tsx（壳，约 300 行，命名导出不变）
├─ 顶部守卫
├─ mount effect + fetchAccounts effect（保留原依赖数组）
├─ <SessionCard/>            纯展示
├─ <LoginModeBanner/>        纯展示
├─ <ManagedAccountsList/>    纯展示（state 留壳，props 透传）
└─ <LegacyAccountsPanel/>    自包含（Legacy state 下沉）

共享：
  account/types.ts   — LoginMode, AccountInfo, EditableAccount, LegacyConfigEntry, PERMISSION_LABELS
  account/utils.ts   — buildEditableAccounts, arraysEqual, logoutAndReload
```

文件布局：`AccountSettings.tsx` 原地保留（调用方 import 路径不变）；子组件与共享模块放 `components/settings/account/`。

## 各组件契约

**SessionCard**（纯展示，D 区块）
- `props: { session: Session | null }`
- 内部 import `logoutAndReload` from `./utils`
- `session` 为 null 时组件内不渲染（壳层也会判断）

**LoginModeBanner**（纯展示，E 区块）
- `props: { loginMode: LoginMode, isManagedMode: boolean }`

**ManagedAccountsList**（纯展示，F 区块；state 留壳）
- `props: {
    session, loadingAccounts, saveError, saveSuccess,
    isDirty, isSaving, currentDraftAccounts,
    onAdd, onUpdate, onTogglePermission, onRemove, onRestore, onSave,
  }`
- 只渲染 F 区块（错误/成功/加载提示 + 草稿列表 + 添加按钮）
- `isManagedMode` / `canManageAccounts` 分支判断由壳层做（决定渲染本组件还是只读提示），不进本组件
- `isCurrentAccount`（`session?.accountId === account.id`）守卫在本组件内计算并作用于删除按钮/角色 select

**LegacyAccountsPanel**（自包含，C+G 区块；state 下沉）
- `props: { accounts: AccountInfo[] }`（只读列表来源）
- 内部 state：`showLegacyConfig`, `legacyEntries`
- 内部 memo：`generatedLegacyAccounts`
- 内部 handler：`addLegacyEntry`, `updateLegacyEntry`, `toggleLegacyPermission`, `removeLegacyEntry`
- 渲染：折叠按钮 + accounts 只读列表 + 表单 + 生成值复制框

## 状态归属

| 状态 | 归属 | 原因 |
|---|---|---|
| session, hasAuth, loginMode | 壳 | 横切关注点 |
| accounts, loadingAccounts | 壳 | Managed diff 基线 + Legacy 只读源；fetchAccounts 写入 |
| fetchAccounts, canManageAccounts, isManagedMode | 壳 | effect 依赖链不可拆 |
| draftAccounts, isDirty, isSaving, saveError, saveSuccess | 壳 | fetchAccounts/saveManagedAccounts 强耦合 |
| currentDraftAccounts memo | 壳 | 依赖 draftAccounts |
| showLegacyConfig, legacyEntries | LegacyAccountsPanel | 独立于 fetch/effect |
| generatedLegacyAccounts memo | LegacyAccountsPanel | 纯前端拼接 |

## 壳层渲染分支（保持原逻辑）
```
{session && <SessionCard/>}
<LoginModeBanner/>
{isManagedMode ? (
  canManageAccounts ? <ManagedAccountsList {...}/> : <ReadOnlyNotice/>
) : (
  canManageAccounts && <LegacyAccountsPanel accounts={accounts}/>
)}
```
注：原"只读提示"块（:567-569）保留在壳层内联（5 行，不值得再抽）。

## 不变量保留（逐条对照原代码）
1. `saveManagedAccounts`（壳内）DELETE → POST → PATCH → `await fetchAccounts()` 顺序与 try/finally 原样保留
2. `arraysEqual` + `originalById` diff 判定保留在壳（arraysEqual 放 utils 共享）
3. `isCurrentAccount` 守卫逻辑随 ManagedAccountsList（计算用 `session?.accountId`）
4. mount effect `[]` 与 fetchAccounts effect `[canManageAccounts, fetchAccounts, loginMode]` 依赖数组原样保留在壳
5. 顶部守卫 `if (!hasAuth && !session) return null` 留壳层最前
6. 服务端报错 → setSaveError 回显路径不变
7. PERMISSION_LABELS / ALL_PERMISSIONS / ROLE_PERMISSIONS 引用关系不变（共享 types/utils）

## 风险与缓解
- **ManagedAccountsList props 偏多（13 个）**：纯展示组件多 props 是常见模式，且都是直接的 state/handler 引用，可读性可接受；不做 hook 化（方案 B）保持本次 diff 聚焦、行为零变化。
- **Legacy 下沉的 effect 安全性**：Legacy 无 effect，纯 useState + useMemo，下沉零风险。
- **'use client'**：所有子组件首行加 `'use client'`（SessionCard 用到 onClick/logoutAndReload；LoginModeBanner 纯展示无交互但保持一致；ManagedAccountsList 有 onChange/onClick；LegacyAccountsPanel 有 onClick/onChange/clipboard）。

## 兼容性
- 调用方 `app/settings/page.tsx` 零改动
- 对外 API（`/api/auth`, `/api/auth/accounts`, `/api/auth/session`）零改动
- 服务端行为零改动
