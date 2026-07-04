# Research: KVideo Store 整理机会

- **Query**: 调研 9 个 store 的整理机会，为"单 store 切片整理"选定目标与方案
- **Scope**: internal
- **Date**: 2026-07-04
- **zustand 版本**: ^5.0.12

## 关键约束（来自项目 CLAUDE.md）

- 禁止使用 process-style 注释（FIXED/Step/Phase 等）
- 不引入新依赖
- 优先"低风险、行为不变"整理；避免"手写 → zustand"重写（SSR 风险）
- 优先新增而非改动旧逻辑；改动应可独立验证、可回滚
- spec 不依赖行号定位

---

## Findings

### 一、每个 Store 模式总览表

| Store | 行数 | 模式 | 对外 API 形态 | persist | localStorage 直读直写 | `typeof window` guard 次数 | 被引用次数 |
|---|---|---|---|---|---|---|---|
| settings-store.ts | 350 | 手写单例对象 `settingsStore` + 顶层函数 | 单例对象 (`getSettings/saveSettings/subscribe/exportSettings/importSettings/resetToDefaults/syncEnvSubscriptions`) + 顶层导出 (`AppSettings` 类型、`getDefaultSources`、`hasStoredAppSetting`) | 无 | 是 (read/write/removeItem) | 5 | 37 |
| premium-mode-settings.ts | 187 | 手写单例对象 `premiumModeSettingsStore` + 辅助函数 | 单例对象 (`getSettings/saveSettings/subscribe`) + `getModeSettings` / `getModeSettingsStore` | 无 | 是 | 2 | 4 |
| iptv-store.ts | 265 | zustand `create`+`persist` | React hook `useIPTVStore` | 是 (`kvideo-iptv-store`, `partialize` 过滤 builtin 与缓存) | 否 | 0 | 5 |
| history-store.ts | 238 | zustand 工厂 `createHistoryStore(name)` + hook | hook 工厂；导出 `useHistoryStore` / `usePremiumHistoryStore` / `useHistory(isPremium)` | 是 (`name` 动态，`version:2` + `migrate`) | 否 | 0 | 6 |
| favorites-store.ts | 131 | zustand 工厂 `createFavoritesStore(name)` + hook | hook 工厂；导出 `useFavoritesStore` / `usePremiumFavoritesStore` / `useFavorites(isPremium)` | 是 (`name` 动态，无 version/migrate) | 否 | 0 | 5 |
| search-history-store.ts | 127 | zustand 工厂 `createSearchHistoryStore(name)` + hook | hook 工厂；导出 `useSearchHistoryStore` / `usePremiumSearchHistoryStore` / `useSearchHistoryStoreSelector` | 是 (`name` 动态，`version:1` 无 migrate) | 否 | 0 | 4 |
| auth-store.ts | 119 | 手写函数集 | 纯函数 (`getSession/setSession/clearSession/isAdmin/hasPermission/hasRole/getProfileId`)；通过 `window.dispatchEvent('kvideo-session-changed')` 通知 | 无 | 是 (sessionStorage + localStorage) | 4 | 14 |
| user-sources-store.ts | 116 | 手写单例对象 `userSourcesStore` | 单例对象 (`getState/subscribe/getSources/addSource/...`) | 无 | 是（key 含 `profileId`） | 2 | 4 |
| settings-helpers.ts | 91 | 纯函数模块 + 常量 | `exportSettings/importSettings` + `SEARCH_HISTORY_KEY/WATCH_HISTORY_KEY` + `sortOptions` | 无 | 是（导出/导入用） | 3 | 2 |

#### 模式分群

- **zustand 群（4 个）**: favorites / history / search-history / iptv
  - favorites / history / search-history 三者形态高度一致：`createXxxStore(name)` 工厂 + 普通版/premium 版双实例 + `useXxx(isPremium)` selector hook；都用 `profiledKey(...)` 注入 key；仅 `persist` 配置不同（history 带 `version:2 + migrate`，search-history 带 `version:1` 无 migrate，favorites 无 version）。
  - iptv 是单实例 hook（无双实例、无 profiledKey），且 `partialize` 过滤 builtin 源与缓存数据。
- **手写单例对象群（3 个）**: settings-store / premium-mode-settings / user-sources-store
  - 三者**对外接口几乎一致**：`getSettings()/getState() + saveSettings(state) + listeners: Set + subscribe() + notifyListeners()`，但代码各自重复实现。
- **手写函数集（1 个）**: auth-store —— 纯函数，无单例对象、无 listener Set，改用 `window.dispatchEvent` 事件通知。
- **纯辅助模块（1 个）**: settings-helpers —— 仅被 settings-store 引用（import）和 settings-store 内 `require('./settings-store')` 反向引用（premium-mode-settings 通过 `require` 反向读 settingsStore）。

### 二、手写 Store 的重复样板

#### 2.1 单例对象 `listeners/subscribe/notifyListeners` 三件套（3 份逐字重复）

settings-store.ts:
```ts
listeners: new Set<() => void>(),
subscribe(listener: () => void): () => void {
  this.listeners.add(listener);
  return () => { this.listeners.delete(listener); };
},
notifyListeners(): void {
  this.listeners.forEach((listener) => listener());
},
```

premium-mode-settings.ts 与 user-sources-store.ts 内是**几乎完全相同**的代码（user-sources 用单行 `() => { this.listeners.delete(listener); }` 写法，其余一致）。

#### 2.2 `getSettings()` 模式（SSR guard + read + parse + 默认值 fallback）

settings-store / premium-mode-settings / user-sources-store 三者结构相同：
```ts
getSettings(): T {
  if (typeof window === 'undefined') return getDefault();
  const stored = localStorage.getItem(KEY);
  if (!stored) return getDefault();
  try {
    const parsed = JSON.parse(stored);
    return { /* 逐字段 fallback 到默认值 */ };
  } catch {
    return getDefault();
  }
}
```

`saveSettings()` 三者也是同构：
```ts
saveSettings(settings: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(settings));
    this.notifyListeners();
  }
}
```

#### 2.3 `getSettings()` 内逐字段 fallback 解析

- settings-store.ts 的 `getSettings()` 在 try 块里**手写了 30+ 字段的逐字段默认值合并**（约 30 行）。
- premium-mode-settings.ts 的 `getSettings()` 又**手写了 20+ 字段的相同模式**（约 22 行），其中很多字段与 settings-store 重叠（sortBy / seekStepSeconds / fullscreenType / proxyMode / danmaku* 等）。
- 这种"逐字段 `parsed.x !== undefined ? parsed.x : default`"模板在两个文件里几乎逐字重复，且新增字段时两处都要改，是 settings-store 与 premium-mode-settings 双写维护负担的根源。

#### 2.4 settings-helpers 是否已是共享 helper

- 是，但**只共享了 export/import 与 key 常量**，没有共享 `read/write/listener` 这种通用原语。
- 被 settings-store 单向 `import { exportSettings, importSettings, SEARCH_HISTORY_KEY, WATCH_HISTORY_KEY }` 使用（引用次数 = 2，另一处是 premium-mode-settings 通过 `require('./settings-store')` 间接）。
- 尚未承担"所有手写 store 共享的 localStorage 原语"职责，存在扩展空间。

### 三、settings-store 350 行职责分析

settings-store 当前混杂 5 个关注点（行号仅为定位参考，不用于 spec）：

1. **类型与常量定义**（顶部 ~70 行）：`AppSettings`、`SortOption`、`ProxyMode`、`AdFilterMode`、`LocaleOption`、`DEFAULT_SEEK_STEP_SECONDS`、`normalizeSeekStepSeconds` 等。这些被 premium-mode-settings 反向 import 复用。
2. **默认值工厂**（`getDefaultAppSettings`）：构造完整 `AppSettings` 默认对象。
3. **源订阅 ENV 解析**（`getEnvSubscriptions`、`syncEnvSubscriptions`）：从 `process.env.SUBSCRIPTION_SOURCES` 解析 JSON / URL 列表，与本地订阅 merge。这块逻辑独立、与"settings 读写"无关。
4. **读写 + 订阅 + reset + import/export**（`settingsStore` 对象）：核心 store 职责。
5. **`getSettings()` 内 30+ 字段 fallback 合并**：与 premium-mode-settings 大量重叠。

#### 拆分边界建议（仅描述概念，不依赖行号）

- **边界 A — 抽出 ENV 订阅解析**：`getEnvSubscriptions` + `syncEnvSubscriptions` 可独立成 `settings-subscriptions.ts`（或 `source-subscriptions.ts`），从 settings-store 移出。这是与"通用 settings 读写"最不耦合的一块，可独立验证。
- **边界 B — 抽出字段合并器**：把 `getSettings()` 的"逐字段 fallback"逻辑抽成纯函数 `mergeWithDefaults(parsed, defaults): AppSettings`，放在 settings-store 内部或 settings-helpers。premium-mode-settings 的等价逻辑也可共享同一思路（但因类型不同，共享需要泛型化，可能不值得，见候选评估）。
- **边界 C — 抽出共享原语**：listeners/subscribe/notifyListeners + SSR-safe read/write 抽成 `settings-helpers.ts` 内的 helper（见整理方向候选）。
- **不推荐拆分**：`AppSettings` 单一对象 + 单一 `kvideo-settings` localStorage key 是导出/导入、reset、跨字段 update 的载体；按"源/播放/显示/弹幕"再拆成多个独立 store 会破坏现有 import/export 契约（37 处调用方依赖单一 `settingsStore`），收益不抵风险。

### 四、SSR 兼容分析

- **手写 store 的 SSR 处理**：靠 `if (typeof window === 'undefined') return defaults/return;`，在 SSR 直接返回默认值/空操作，行为可预期。
- **zustand persist 的 SSR 处理**：本项目 4 个 zustand store 都没有显式传 `storage: createJSONStorage(...)`，使用 persist 默认存储。在 zustand v5 + Next.js（含 RSC/edge）下：
  - persist 默认尝试访问 `localStorage`；若 SSR 期间（组件在服务端渲染）执行 store 初始化，会在不存在 `localStorage` 的环境抛错。
  - 本项目这 4 个 store 都是**通过 React hook 暴露**（`useXxxStore`），而 hook 只在客户端组件内调用；只要使用方不在 server component 里直接读这些 store，SSR 是安全的。
  - 但若把**手写 store 改写成 zustand**，原本"SSR 安全的纯函数/单例对象"会变成"依赖 hook 调用点"的 API，37 处 settingsStore 调用方（很多是非 hook 上下文，如 `lib/` 内工具函数、API route、middleware）将无法直接使用 —— 这是为什么 settings-store 注释明确写 `NOT Zustand — needs to stay synchronous for profiled storage keys`（auth-store 同理）。
- **结论**：保持手写 store 手写、不强行迁到 zustand，是当前的明确设计选择。整理方向应聚焦"手写 store 内部的样板抽取"，而非跨模式统一。

### 五、调用方影响面（按引用次数排序）

| Store | 引用次数 | 影响面 |
|---|---|---|
| settings-store | 37 | 极广（最大风险点，任何 API 变更影响 37 处） |
| auth-store | 14 | 广（含 lib/auth、API、middleware） |
| history-store | 6 | 中 |
| iptv-store | 5 | 中 |
| favorites-store | 5 | 中 |
| premium-mode-settings | 4 | 小 |
| search-history-store | 4 | 小 |
| user-sources-store | 4 | 小 |
| settings-helpers | 2 | 小（仅被 settings-store 直接 import） |

> 注：引用次数为 grep `from '@/lib/store/xxx'` / `from './xxx'` / `from '../store/xxx'` 的命中文件数；同一文件多次 import 计 1。

### 六、相关 Spec

- `.trellis/spec/frontend/state-management.md` —— 全文为空模板（"To be filled by the team"），**目前无任何 store 写法约束**。整理工作不会违反现有 spec；整理完成后可考虑回填此 spec。
- `.trellis/spec/guides/cross-layer-thinking-guide.md` —— 提及 store/localStorage 的跨层考量（未读全文，整理时可参考）。

---

## 整理方向候选

### 候选 1：抽出共享 `createLocalStorageStore` 原语（手写单例对象群）

**目标 store**: settings-store + premium-mode-settings + user-sources-store（3 个手写单例对象）

**具体改法**:
- 在 `settings-helpers.ts`（或新文件 `local-storage-store.ts`）新增一个工厂：
  ```ts
  export function createListenerSet() {
    const listeners = new Set<() => void>();
    return {
      subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
      notify: () => listeners.forEach(l => l()),
    };
  }
  export function readJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    try { return JSON.parse(stored) as T; } catch { return fallback; }
  }
  export function writeJson(key: string, value: unknown): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  }
  ```
- 三个 store 内部用这些原语替换各自重复的 `listeners/subscribe/notifyListeners`、`getSettings` 的 read/parse/catch、`saveSettings` 的 write。**对外 API 完全不变**（仍是同一个 `settingsStore`/`premiumModeSettingsStore`/`userSourcesStore` 对象、同样的方法签名）。

**风险**: 极低。纯内部重构，对外契约不变；每个 store 可逐个迁移、独立验证。

**收益**:
- 消除 ~3 份 listeners/subscribe/notifyListeners 重复（每份 ~10 行，合计 ~30 行）。
- 消除 3 份 SSR guard + read + parse + catch 样板（每份 ~10 行，合计 ~30 行）。
- 后续新增手写 store 直接复用，杜绝再次发散。
- 预计净减 ~40-60 行，且集中了 `typeof window` guard（SSR 行为更易审计）。

**对调用方的影响**: 零（API 不变，import 路径不变）。

---

### 候选 2：settings-store 内部拆分（抽出 ENV 订阅解析 + 字段合并器）

**目标 store**: settings-store（仅此一个）

**具体改法**:
- **子方向 2a**：把 `getEnvSubscriptions` + `syncEnvSubscriptions` 抽到 `lib/store/settings-subscriptions.ts`（或 `lib/utils/source-subscriptions.ts`），settings-store 从那里 import。这两个函数与"settings 读写"逻辑正交，可独立测试。
- **子方向 2b**（可选，风险略高）：把 `getSettings()` 内 30+ 字段 fallback 合并抽成纯函数 `mergeAppSettings(parsed, defaults)`，便于后续若要再拆 settings 切片时复用。

**风险**:
- 2a：极低（函数无状态、无副作用依赖，移动即可）。
- 2b：中（30+ 字段合并逻辑一旦手抖易错，需要对照测试）。

**收益**:
- 2a：settings-store 减少 ~50 行，职责更聚焦；ENV 订阅逻辑可独立单测。
- 2b：减少 getSettings 单函数长度，但收益有限（premium-mode-settings 因类型不同无法直接复用，需泛型化才划算）。

**对调用方的影响**: 零（settings-store 对外 API 不变；2a 移动的函数若被外部直接 import 则需保留 re-export —— 经检查，`getEnvSubscriptions` 未 export，`syncEnvSubscriptions` 是 settingsStore 方法，无外部直接 import 风险）。

---

### 候选 3：统一 zustand 三个工厂的 persist 配置风格（低收益）

**目标 store**: favorites / history / search-history（三个 zustand 工厂）

**具体改法**: 让三者 persist 配置风格对齐（都带 version、migrate 可选统一签名）。**不强行抽公共工厂**（三者 action 差异较大，强行合并会引入复杂泛型）。

**风险**: 低（仅 persist 元数据调整，不影响已持久化数据的兼容性 —— version 提升才触发 migrate，不动 version 无影响）。

**收益**: 小（仅风格一致性，行数不减少）。**不推荐作为首选**。

---

## 推荐首选：候选 1（共享 localStorage store 原语）

**理由**:
1. **最低风险**：对外 API 完全不变，37+14+4+5 处调用方零影响；可逐 store 迁移、逐个验证、随时回滚。
2. **行为不变**：只是把"已经逐字重复的代码"挪到共享 helper，运行时行为等价。
3. **收益明确**：消除 ~60-90 行样板，集中 SSR guard 与 read/write/parse 逻辑，未来新增手写 store 不再发散。
4. **符合约束**：不引入新依赖、不改写手写→zustand、不触碰 spec。
5. **契合任务标题"单 store 切片整理"**：候选 1 完成后，可顺势做候选 2a（settings-store 内部进一步切片），形成"先抽公共原语、再拆内部职责"的两步走。

**建议执行顺序**:
- Step 1（候选 1）：在 settings-helpers 新增 `createListenerSet` / `readJson` / `writeJson`，先迁 user-sources-store（最小、引用最少，4 处），验证 API 等价。
- Step 2：迁 premium-mode-settings（4 处引用）。
- Step 3：迁 settings-store（37 处引用，最后迁，风险最大）。
- Step 4（可选，候选 2a）：抽 settings-store 的 ENV 订阅解析到独立模块。

每步独立 commit、独立验证（grep 对比迁前后对外暴露的方法签名 + 手动跑一次 settings 导入导出 + reset）。

---

## Caveats / Not Found

- **未读全文** `.trellis/spec/guides/cross-layer-thinking-guide.md`，不确定其中是否有关于 store/localStorage 的具体约束（grep 命中关键词但未读内容）。整理实施前建议主 agent 快速确认。
- **引用次数统计口径**：仅统计 `lib/`、`components/`、`app/`、`hooks/` 目录下的 `.ts/.tsx`，未覆盖 `scripts/`、`tests/`、`pages/`（若存在）。实际影响面可能略高。
- **`require('./settings-store')` 反向依赖**：premium-mode-settings.ts 用 `require` 而非 ES import 来读 settingsStore（避免循环依赖）。候选 1 不影响此模式，但若做候选 2a 需注意保持 settingsStore 默认导出形态。
- **auth-store 是否纳入候选 1**：auth-store 是"纯函数 + window event 通知"，不是 listener Set 模式，与候选 1 的三件套不匹配。建议 auth-store 单独保留，不强行套原语。
- **profiledKey 依赖链**：favorites/history/search-history 通过 `profiledKey(...)` 生成 key，而 `profiledKey` 内部调用 `getProfileId()`（来自 auth-store）。这说明 zustand 群已隐式依赖 auth-store；整理时若动 auth-store 需注意此链。settings-store / premium-mode-settings / user-sources-store 用固定 key 或 profileId 后缀 key，不走 profiledKey。
