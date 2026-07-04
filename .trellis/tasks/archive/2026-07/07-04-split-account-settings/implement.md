# Implement: 拆分 AccountSettings 组件

执行顺序，每步独立可验证。仅搬迁，不改业务逻辑。

## 准备
1. 切分支 `refactor/split-account-settings` + `task.py start`
   状态：已完成

## 共享模块
2. 新建 `components/settings/account/types.ts`
   - 迁移：LoginMode, AccountInfo, EditableAccount, LegacyConfigEntry, PERMISSION_LABELS
   - 从 `@/lib/store/auth-store` re-export `Permission`, `Role`（或直接 import）
   验证：tsc 通过
3. 新建 `components/settings/account/utils.ts`
   - 迁移：buildEditableAccounts, arraysEqual, logoutAndReload
   - import 类型从 `./types`，clearSession 从 `@/lib/store/auth-store`
   验证：tsc 通过

## 子组件
4. 新建 `account/SessionCard.tsx`（`'use client'`）— D 区块
   - props: `{ session }`
   - import logoutAndReload from `./utils`，Shield/LogOut from lucide
   验证：tsc 通过
5. 新建 `account/LoginModeBanner.tsx`（`'use client'`）— E 区块
   - props: `{ loginMode, isManagedMode }`
   - import Info from lucide
   验证：tsc 通过
6. 新建 `account/ManagedAccountsList.tsx`（`'use client'`）— F 区块（纯展示）
   - props: `{ session, loadingAccounts, saveError, saveSuccess, isDirty, isSaving, currentDraftAccounts, onAdd, onUpdate, onTogglePermission, onRemove, onRestore, onSave }`
   - 内部计算：extraPermissions、isCurrentAccount（session?.accountId === account.id）
   - import ALL_PERMISSIONS/ROLE_PERMISSIONS, Icons, PERMISSION_LABELS
   - 核对：删除按钮 disabled/title、角色 select disabled、用户名 input disabled(!isNew) 全部保留
   验证：tsc 通过
7. 新建 `account/LegacyAccountsPanel.tsx`（`'use client'`）— C+G 区块（自包含）
   - props: `{ accounts }`
   - 内部 state: showLegacyConfig, legacyEntries
   - 内部 memo: generatedLegacyAccounts
   - 内部 handler: addLegacyEntry, updateLegacyEntry, toggleLegacyPermission, removeLegacyEntry
   - import ALL_PERMISSIONS/ROLE_PERMISSIONS, Icons, PERMISSION_LABELS, types
   验证：tsc 通过

## 壳层改写
8. `AccountSettings.tsx` 改写
   - 保留：session/hasAuth/loginMode/accounts/draftAccounts/loadingAccounts/saveError/saveSuccess/isSaving/isDirty（10 个 state）
   - 保留：canManageAccounts, isManagedMode, fetchAccounts, 2 effect（依赖数组不变）, currentDraftAccounts memo, 6 个 Managed handler（addDraftAccount, updateDraftAccount, toggleDraftPermission, removeDraftAccount, restoreDrafts, saveManagedAccounts）
   - 删除：showLegacyConfig/legacyEntries state、4 个 Legacy handler、generatedLegacyAccounts memo（全迁至 LegacyAccountsPanel）
   - 删除：D/E/F/G 的 JSX（迁至子组件）
   - import 共享 types/utils + 4 个子组件
   - 渲染分支：
     ```
     {session && <SessionCard session={session}/>}
     <LoginModeBanner loginMode={loginMode} isManagedMode={isManagedMode}/>
     {isManagedMode ? (
       canManageAccounts ? <ManagedAccountsList {...}/> : <ReadOnlyNotice/>
     ) : (
       canManageAccounts && <LegacyAccountsPanel accounts={accounts}/>
     )}
     ```
   - 顶部守卫 `if (!hasAuth && !session) return null` 留最前
   验证：tsc 通过；行数约 300

## 验证
9. 全量 `tsc --noEmit`
   验证：无新增报错
10. `next build`
    验证：edge 构建通过
11. `wc -l` 核对行数
    验证：壳层约 300，最大子组件 < 250
12. 人工渲染对照（dev server）
    - 未登录态：组件不渲染（顶部守卫）
    - super_admin + managed：账户 CRUD（增/删/改/权限/保存/还原）、退出登录
    - super_admin + legacy：折叠/展开、只读列表、表单增删、生成值复制
    - admin/viewer + managed：只读提示
    验证：行为与拆分前一致

## 自检
13. diff 自检：仅搬迁，无业务逻辑改动；prd 不变量 1-8 全部保留
14. 提交（用户确认后）

## 回滚
- 任一步骤出现行为差异或构建失败：单步 `git checkout` 回退对应文件；整体放弃新分支，main 不受影响
