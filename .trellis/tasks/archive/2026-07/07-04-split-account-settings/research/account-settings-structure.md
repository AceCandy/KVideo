# Research: AccountSettings 内部结构侦察

- **Query**: 为后续拆分 `components/settings/AccountSettings.tsx`（713 行）提供事实依据
- **Scope**: internal
- **Date**: 2026-07-04
- **Evidence file**: `components/settings/AccountSettings.tsx`（除非另注，所有行号均指此文件）

---

## 1. 顶层组件契约

| 项 | 事实 | 证据 |
|---|---|---|
| `'use client'` 指令 | 有，文件首行 | `AccountSettings.tsx:1` |
| 导出形式 | **命名导出** `export function AccountSettings()`，无默认导出 | `AccountSettings.tsx:82` |
| Props 接口 | **无 props**（零参数函数 `AccountSettings()`） | `AccountSettings.tsx:82` |
| 泛型/泛型约束 | 无 | — |
| 返回类型 | 隐式 JSX；当 `!hasAuth && !session` 时返回 `null` | `AccountSettings.tsx:336` |

**对外契约极简**：调用方只需 `<AccountSettings />`，无需传入任何数据。这意味着拆分对外完全透明，只要保持命名导出和 `'use client'` 即可。

---

## 2. 逻辑分区清单（按行号段）

> 全文 713 行；按职责可分为 **A~F 六个区块** + 文件顶部的类型/常量/工具函数。

### 文件头部（10–80 行）：类型、常量、模块级工具
- `LoginMode` / `AccountInfo` / `EditableAccount` / `LegacyConfigEntry` 类型（`:10`, `:12`, `:22`, `:33`）
- `PERMISSION_LABELS` 中文映射常量（`:40`）
- `buildEditableAccounts`（`:53`）：把服务端 `AccountInfo[]` 转成可编辑草稿
- `arraysEqual`（`:64`）：权限数组比较，用于 PATCH 增量判定
- `logoutAndReload`（`:71`）：模块级函数，调用 `DELETE /api/auth/session` 后 `clearSession()` + `window.location.reload()`

### 区块 A — Session/模式 读取与挂载 effect（83–141 行）
- 职责：读 `getSession()` 拿当前会话；`GET /api/auth` 拿 `hasAuth` + `loginMode`；触发 `fetchAccounts`
- 关键 state：`session`, `hasAuth`, `loginMode`
- 关键 handler：`fetchAccounts`（`useCallback`，:99）
- effects：`:124`（mount 读 session + 配置）、`:138`（canManageAccounts 变化时拉账户）

### 区块 B — 托管账户草稿编辑器（state + handler 部分：143–284 行）
- 职责：在 `managed` 模式下，对 `draftAccounts` 进行增/改/权限切换/删/还原/保存
- state：`draftAccounts`, `isDirty`, `isSaving`, `saveError`, `saveSuccess`
- handlers：`addDraftAccount`(:148), `updateDraftAccount`(:164), `toggleDraftPermission`(:176), `removeDraftAccount`(:193), `restoreDrafts`(:203), `saveManagedAccounts`(:210)
- memo：`currentDraftAccounts`(:143) 过滤掉 `markedForDeletion`
- **保存逻辑核心**：`saveManagedAccounts`(:210–284) 串行执行 DELETE → POST → PATCH，再调 `fetchAccounts()` 重拉

### 区块 C — Legacy 兼容账户生成器（286–334 行）
- 职责：在 `legacy_password` 模式下，编辑 `legacyEntries`，生成 `ACCOUNTS=` 字符串
- state：`legacyEntries`, `showLegacyConfig`（后者在 UI 中用）
- handlers：`addLegacyEntry`(:286), `updateLegacyEntry`(:293), `toggleLegacyPermission`(:303), `removeLegacyEntry`(:316)
- memo：`generatedLegacyAccounts`(:320) 拼接 `password:name[:role[:permissions]]` 字符串
- **只在前端拼字符串，不调用 API**

### 区块 D — 当前会话卡片 UI（336–376 行）
- 职责：渲染当前登录用户的头像/角色/退出登录按钮
- 依赖：`session`, `logoutAndReload`
- 不修改任何 state

### 区块 E — 模式提示横幅 UI（378–397 行）
- 职责：根据 `isManagedMode` 显示托管/环境变量两种说明文案
- 纯展示，无 state

### 区块 F — 托管账户列表 UI（399–565 行，最大块约 166 行）
- 职责：渲染 `currentDraftAccounts`，每条含用户名/显示名/角色 select/密码 input/额外权限 checkbox/删除按钮
- 依赖：`canManageAccounts`, `loadingAccounts`, `isDirty`, `isSaving`, `saveError/saveSuccess`, `restoreDrafts`, `saveManagedAccounts`, `addDraftAccount`, `updateDraftAccount`, `toggleDraftPermission`, `removeDraftAccount`
- 内联计算：每条 `extraPermissions = ALL_PERMISSIONS.filter(p => !ROLE_PERMISSIONS[role].includes(p))`（`:449`）；`isCurrentAccount = session?.accountId === account.id`（`:450`，决定是否禁用删除/改角色）
- 包含错误/成功提示条（`:430–440`）和加载占位（`:442`）

### 区块 G — Legacy 兼容账户 UI（571–708 行，约 137 行）
- 职责：折叠面板渲染 `accounts` 只读列表 + `legacyEntries` 表单 + `generatedLegacyAccounts` 复制框
- 依赖：`accounts`, `showLegacyConfig`, `legacyEntries`, `generatedLegacyAccounts`, `addLegacyEntry`, `updateLegacyEntry`, `toggleLegacyPermission`, `removeLegacyEntry`
- 含 `navigator.clipboard.writeText` 调用（`:696`）

### 顶部守卫
- `if (!hasAuth && !session) return null;`（`:336`）——组件可能完全不渲染

---

## 3. 状态盘点

### useState（共 11 个，全部集中在 :83–94）

| State | 行 | 用途 | 读于 | 写于 |
|---|---|---|---|---|
| `session` | :83 | 当前会话对象（`getSession()` 返回值） | A,D,F | A(:125) |
| `hasAuth` | :84 | 服务端是否启用鉴权 | 守卫:336 | A(:130) |
| `loginMode` | :85 | `'none'\|'legacy_password'\|'managed'` | E,F,G 入口 | A(:131) |
| `accounts` | :86 | 服务端账户快照 | G 只读列表 | A(`fetchAccounts`:114) |
| `draftAccounts` | :87 | 可编辑草稿（含 `isNew`/`markedForDeletion`） | F, B memo | B handlers, A(:115) |
| `loadingAccounts` | :88 | 列表加载态 | F | A(:102/120) |
| `saveError` | :89 | 保存/加载错误文本 | F | A/B 多处 |
| `saveSuccess` | :90 | 保存成功文本 | F | B handlers |
| `isSaving` | :91 | 保存中 | F | B(:211/282) |
| `isDirty` | :92 | 是否有未保存改动（控制按钮 disabled） | F | B handlers |
| `showLegacyConfig` | :93 | Legacy 面板折叠态 | G | G(:585) |
| `legacyEntries` | :94 | Legacy 表单数组 | G, C memo | C handlers |

### useReducer
- **无**。所有状态都用零散 `useState`。

### useEffect（共 2 个）

| 行 | 依赖数组 | 作用 | 风险 |
|---|---|---|---|
| :124–136 | `[]` | mount 时 `setSessionState(getSession())` + `GET /api/auth` 设置 `hasAuth`/`loginMode` | `.catch` 静默吞错，保持默认 `hasAuth=false` |
| :138–141 | `[canManageAccounts, fetchAccounts, loginMode]` | 当具备管理权限或模式变化时拉账户 | `fetchAccounts` 是 `useCallback([canManageAccounts])`，`canManageAccounts` 又依赖 `session`，形成 `session → canManageAccounts → fetchAccounts → effect` 链；初次渲染 + `session` 异步设置后会触发二次拉取。**注意**：依赖含 `loginMode`，但 `fetchAccounts` 内部并不读 `loginMode`，这一依赖实际用于在模式确定后重新触发——拆分时若移动此 effect 需保留同一依赖集合 |

### useMemo / useCallback

| 名称 | 行 | 类型 | 依赖 |
|---|---|---|---|
| `fetchAccounts` | :99 | `useCallback` | `[canManageAccounts]` |
| `currentDraftAccounts` | :143 | `useMemo` | `[draftAccounts]` |
| `generatedLegacyAccounts` | :320 | `useMemo` | `[legacyEntries]` |

### 引用的外部 store / 模块

| 模块 | 引入内容 | 调用点 |
|---|---|---|
| `@/lib/store/auth-store` | `clearSession`, `getSession`, `Permission`, `Role` 类型 | `getSession()` 在 :125；`clearSession()` 在 :78（模块级 `logoutAndReload`） |
| `@/lib/auth/permissions` | `ALL_PERMISSIONS`, `ROLE_PERMISSIONS` | F 计算额外权限(:449)、G 同样计算(:619) |

**未引用**：`settings-store` / `user-sources-store` / `premium-mode-settings` / `auth-store` 的 Zustand 部分（auth-store 是模块级同步 store，非 Zustand，见 `lib/store/auth-store.ts:1-3`）。

---

## 4. 服务端调用

| API pathname | 方法 | 时机 | 代码 |
|---|---|---|---|
| `/api/auth` | GET | mount effect | :127 |
| `/api/auth/accounts` | GET | `fetchAccounts`（被 effect :138 触发） | :106 |
| `/api/auth/accounts` | POST | `saveManagedAccounts` 内，对每条 `isNew` 草稿 | :234 |
| `/api/auth/accounts/{id}` | PATCH | `saveManagedAccounts` 内，对已存在且有 diff 的草稿 | :266 |
| `/api/auth/accounts/{id}` | DELETE | `saveManagedAccounts` 内，先于 POST/PATCH 处理 `markedForDeletion` | :220 |
| `/api/auth/session` | DELETE | `logoutAndReload`，退出登录按钮点击 | 模块级 :73 |

**注意顺序不变量**：`saveManagedAccounts`(:210) 严格 **先 DELETE → 再 POST/PATCH**，且整段在一个 `try/finally` 内串行 `await`；任何一条失败即抛出并跳到 `catch`，但已成功的删除/创建不会回滚（**服务端可能处于部分写入状态**，靠末尾 `await fetchAccounts()` 重拉覆盖本地草稿）。

---

## 5. imports 分类

`AccountSettings.tsx:3-8`：

| 分类 | import | 仅服务于哪个区块 |
|---|---|---|
| React | `useCallback, useEffect, useMemo, useState` (:3) | 全局 |
| 三方 UI | `Info, LogOut, Shield` from `lucide-react` (:4) | `LogOut/Shield`→D；`Info`→E |
| 本项目 store | `clearSession, getSession, Permission, Role` from `@/lib/store/auth-store` (:5) | `getSession`→A/D；`clearSession`→模块级工具(:71) |
| 本项目 UI 子组件 | `SettingsSection` from `./SettingsSection` (:6) | 顶层 wrapper |
| 本项目 UI | `Icons` from `@/components/ui/Icon` (:7) | F（Users/Trash/Plus）、G（Settings/Trash/Plus/Copy） |
| 本项目权限 | `ALL_PERMISSIONS, ROLE_PERMISSIONS` from `@/lib/auth/permissions` (:8) | F、G |

**拆分带走提示**：
- `SettingsSection` 是顶层包装，主组件保留即可。
- `Icons.Users/Trash/Plus/Copy/Settings` 各区块用到的子集不同，子组件化时可按需 import。
- `ALL_PERMISSIONS/ROLE_PERMISSIONS` 被 F 和 G **同时使用**，若两块都拆出子组件则两个文件都要 import（无重复逻辑，仅常量）。

---

## 6. 调用方

### 全仓搜索结果

```
app/settings/page.tsx:10   import { AccountSettings } from '@/components/settings/AccountSettings';
app/settings/page.tsx:87   <AccountSettings />
```

- **唯一调用点**，且**不传任何 props**（见 `app/settings/page.tsx:87` 上下文 :80–95）。
- 同级兄弟组件：`SettingsHeader`, `AppVersionSettings`, `PermissionGate`+`PlayerSettings` 等。

**结论**：props 接口无外部约束，拆分时无需保持任何 props 向后兼容；只需保留 `export function AccountSettings()` 命名导出和 `'use client'`。

---

## 7. 可拆分边界建议（3 个候选方案）

> 所有方案都保留 `AccountSettings` 作为对外命名导出壳，调用方零改动。

### 方案 A — 按功能区块抽子组件（推荐起步）

| 子组件 | 来源区块 | 估算行数 | 提升/下沉 |
|---|---|---|---|
| `SessionCard` | D (:341–376) | ~35 | props: `session`；自带 `logoutAndReload` 或由壳传入 |
| `LoginModeBanner` | E (:378–397) | ~20 | props: `loginMode` |
| `ManagedAccountsPanel` | B state/handler + F UI | ~250（含逻辑） | **状态下沉**：将 `draftAccounts/isDirty/isSaving/saveError/saveSuccess/accounts/loadingAccounts` 全部移入此组件，壳只传 `session`+`loginMode` |
| `LegacyAccountsPanel` | C state/handler + G UI | ~200（含逻辑） | 状态下沉：`legacyEntries/showLegacyConfig/accounts` 移入；需要服务端 `accounts` 只读列表 |

- **风险点**：
  - `accounts` 同时被 Managed（编辑源）和 Legacy（只读展示）使用 → 两块都需 `accounts`。**建议**：壳层保留 `fetchAccounts` 和 `accounts`/`loadingAccounts`，作为 prop 下传给两个 Panel；其余 state 各自下沉。
  - `session` 在 F 内用于 `isCurrentAccount` 判定（:450）和 `canManageAccounts`（:96），必须下传。
- **对外 props 接口**：不变（仍零 props）。
- **是否需要 Context**：不需要。子组件数量少，props 传递足够。

### 方案 B — 抽 custom hook + 纯展示子组件（更彻底）

- 新增 `useManagedAccounts(session)` hook：封装 `accounts/draftAccounts/loadingAccounts/isDirty/isSaving/saveError/saveSuccess` + 全部 B 区块 handler + `fetchAccounts` + `saveManagedAccounts`。返回一个对象。
- 新增 `useLegacyAccounts()` hook：封装 `legacyEntries/showLegacyConfig/generatedLegacyAccounts` + C 区块 handler。
- 子组件 `ManagedAccountList` / `LegacyAccountEditor` / `SessionCard` / `LoginModeBanner` 全部纯展示。
- 壳层 `AccountSettings` 只负责 `session/hasAuth/loginMode` + 调用两个 hook + 组合展示。
- **风险点**：
  - hook 内部的 effect 依赖链（`session → canManageAccounts → fetchAccounts → effect`）必须整体迁移，不能拆断，否则会丢失自动重拉。
  - `saveManagedAccounts` 的 DELETE→POST→PATCH 顺序是不变量，迁移时原样保留。
- **对外 props 接口**：不变。
- **Context**：可选——若子组件层级变深，可用 `AccountsContext` 注入；当前规模不必要。

### 方案 C — 中间边界：先抽两个最大的 UI 块（最小风险增量）

- 第一步只抽出 `ManagedAccountList`（F 区块 UI，约 117 行）和 `LegacyAccountEditor`（G 区块 UI，约 137 行）作为**纯展示子组件**，state/handler 全部以 props 透传。
- 壳层保持所有 `useState`/`useEffect`/handler，只把 JSX 拆走。
- **优点**：第一步 diff 最小、风险最低，先把 713 行降到 ~450 行；后续再做 hook 抽离（方案 B）。
- **缺点**：壳层 props 数量会爆炸（`ManagedAccountList` 需要 ~12 个 props），可读性短期下降。
- **对外 props 接口**：不变。

### 推荐路径
**方案 C 作为第一步**（低风险、立即见效）→ 积累信心后做**方案 B**（把 state 收进 hook，壳变薄）。方案 A 与 B 可并存：A 是组件切分，B 是逻辑切分，最终形态通常是 A+B。

---

## 8. 风险与不变量

### 必须保留的内部不变量

1. **保存顺序不变量**（`saveManagedAccounts` :210–284）
   - 先 DELETE 所有 `markedForDeletion` → 再 POST 所有 `isNew` → 再 PATCH 有 diff 的已存在账户 → 最后 `await fetchAccounts()` 重拉。
   - 任何拆分都必须保留这一顺序，否则会出现"删除后又被 PATCH 复活"或"创建后 PATCH 找不到 id"。

2. **Diff 增量不变量**（:253–264）
   - PATCH 仅在字段实际变化时发送（用 `arraysEqual` 比较权限）。拆分时 `arraysEqual` 和 `originalById` 必须随之迁移。

3. **`isCurrentAccount` 守卫**（:450, :473, :505）
   - 当前登录账户不能被删除、不能改自己的 role。拆分后 `session.accountId` 必须传入子组件。

4. **`canManageAccounts` 计算**（:96）
   - 仅当 `session?.role === 'super_admin'` 才显示编辑 UI。`viewer`/`admin` 看到只读提示（:567–569）。

5. **mount effect 与 fetchAccounts effect 的依赖链**（:124, :138）
   - `session` 异步设置会触发 `canManageAccounts` 重算 → `fetchAccounts` 引用变化 → 第二个 effect 重跑。**禁止**把这两个 effect 拆到不同组件、或把 `fetchAccounts` 的依赖改掉，否则会丢失自动重拉或陷入无限循环。

6. **顶部守卫**（:336 `if (!hasAuth && !session) return null;`）
   - 必须保留在壳层最前面，否则未登录时会闪烁账户 UI。

### 表单校验逻辑
- **客户端无显式校验**。用户名/显示名/密码均为必填但**代码未阻止空提交**：
  - POST/PATCH 直接把空字符串发给服务端，依赖服务端 `:234` 返回的错误（`data.error`）回显在 `saveError`。
  - Legacy 表单仅在 `generatedLegacyAccounts` memo 中过滤掉空 password/name（:322），不阻止生成。
- 拆分时应保持"服务端报错→setSaveError"的现行行为，不要借机加前端校验（违反 surgical change）。

### 可访问性（a11y）/键盘行为
- 所有交互元素均为原生 `<button>`/`<input>`/`<select>`/`<label>` 包裹，无自定义键盘焦点管理，无 `tabIndex`/`role`/`aria-*` 依赖。
- **拆分时只要保持原生表单元素结构，a11y 行为天然保留**。唯一需注意：F 区块删除按钮的 `title`（:475）和 disabled 态（:473）必须随子组件一起迁移。
- Legacy 折叠面板（:584 `setShowLegacyConfig`）目前**无 `aria-expanded`**，不是不变量，拆分时保持现状即可。

### 隐性耦合
- `logoutAndReload`（模块级，:71）调用 `clearSession()` 并 `window.location.reload()`——**与 React 状态无关**，可直接搬到任何子组件或保留在 utils 文件。
- `getSession()` 同步读取（:125），`auth-store` 注释明确要求"stay synchronous"（`lib/store/auth-store.ts:3`）。拆分后任何组件调用 `getSession()` 都安全。

---

## 关键发现摘要（给主代理的速览）

1. **零 props + 单一调用点**（`app/settings/page.tsx:87`）→ 拆分对外完全透明。
2. **11 个 useState + 2 个 effect + 3 个 memo/callback**，无 reducer；状态可清晰分成"会话/模式"（壳层）+"托管草稿"（B/F）+"Legacy 草稿"（C/G）三组。
3. **最大整块 = F（托管账户 UI 166 行）+ B（其 state/handler 142 行）≈ 308 行**，是拆分首要目标。
4. **`saveManagedAccounts` 的 DELETE→POST→PATCH→refetch 顺序是硬不变量**。
5. **无前端校验、无自定义 a11y 行为**，拆分风险集中在状态迁移而非行为兼容。
6. 推荐路径：先方案 C（抽 UI 子组件，最小 diff）→ 再方案 B（抽 hook 收编 state）。
