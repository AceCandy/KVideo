# A2 技术设计

## 现状关键事实（来自调研）

- session cookie：`kvideo_session`，httpOnly、sameSite=lax、secure(prod)、path=/、maxAge=30d（`lib/server/auth.ts:69,317-325`）。浏览器同源自动携带。
- 验签：`verifySessionToken`（`lib/server/auth-helpers.ts:139-176`），纯 WebCrypto `crypto.subtle`，edge 可用，但**不校验过期**。
- 密钥派生：`resolveSessionSecret(loginMode)`（`auth.ts:247-257`）——managed 用 `AUTH_SECRET`（不依赖 Redis）；legacy 用 `legacy:${ADMIN_PASSWORD||ACCESS_PASSWORD}:${ACCOUNTS}:${PREMIUM_PASSWORD}`。
- 模式判定 `getPublicAuthConfig`（`auth.ts:218-232`）会 `await` Redis（`getManagedAccountCount`），middleware 不能每请求调用。
- `app/layout.tsx:123-132` 已有一份 **SSR 兜底 hasAuth 推断**（纯 env，无 Redis），与前端 `PasswordGate` 行为一致。
- 业务 API（proxy/search-parallel/premium/*/detail/danmaku/iptv/douban）当前**均不检查 session**；仅 `/api/auth/accounts/*` 自验 super_admin。
- 前端登录后 `window.location.reload()`（`PasswordGate.tsx:208`），cookie 自动带，无任何手动 token header，无统一 401 拦截。

## 方案

### Part 1 — session 服务端过期校验

- 在 `lib/server/auth-helpers.ts` 导出常量 `SESSION_MAX_AGE_SECONDS = 60*60*24*30`，并删除 `lib/server/auth.ts:81` 的本地定义、改为 import（值不变，消除重复）。
- `verifySessionToken` 在 payload 字段校验通过后、return 前，增加时钟校验：
  - `iat` 非有限数 → `null`
  - `iat + SESSION_MAX_AGE_SECONDS*1000 < Date.now()` → `null`
- 不改 `SessionPayload` 结构、不引入 `exp` 字段；存量 token 的 `iat` 已在签发时写入，超过 30 天的自然失效（符合预期），30 天内的继续有效。

### Part 2 — middleware 统一鉴权（新增，仅护 API）

新增 `lib/auth/session-edge.ts`（edge-safe，零外部依赖，**不 import `auth.ts`**）：

| 导出 | 作用 | 复刻来源 |
|---|---|---|
| `SESSION_COOKIE_NAME` | `'kvideo_session'` | `auth.ts:69` |
| `hasAuthConfiguredFromEnv()` | env 推断是否非 none 模式 | `layout.tsx:123-132` |
| `resolveSessionSecretFromEnv()` | env 推断验签密钥 | `auth.ts:247-257`（去 loginMode 参数：AUTH_SECRET 优先，否则 legacy 派生） |

新增 `middleware.ts`（项目根，与 `app/` 同级，默认 edge runtime）：

```
请求 →
  1. 非 /api/*  → next()                 // 页面交给 PasswordGate
  2. /api/auth* → next()                 // 登录/状态端点白名单（防死锁）
  3. OPTIONS    → next()                 // CORS 预检不带凭证，放行
  4. hasAuthConfiguredFromEnv() === false → next()   // none 模式硬放行
  5. resolveSessionSecretFromEnv() === null → next() // 无密钥保守放行
  6. 读 cookie → verifySessionToken(含过期)
     - 失败/无 cookie → 401 JSON { error: 'Authentication required' }
     - 成功 → next()
```

matcher 排除静态资源：`'/((?!_next/static|_next/image|favicon.ico|icon|sw\\.js|workbox|manifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2|ttf|otf|txt|xml)).*)'`。API/页面判断在 handler 内用 `pathname` 完成。

### 为何“只护 API、不拦页面”

- 没有独立登录页；未登录访问页面若被 middleware 302 会死循环。
- `PasswordGate` 已在客户端锁屏，页面内容由它接管；API 才是真正的数据出口，是必须堵的洞。
- SSR 阶段页面 HTML 仍会渲染（现有行为），A2 不改变这一点。

## 兼容性与回归分析

| 场景 | 改造前 | 改造后 | 是否回归 |
|---|---|---|---|
| none 模式匿名用 API | 放行 | 放行 | 否 |
| 设 ACCESS_PASSWORD + 已登录 | API 放行（cookie 自动带） | 放行 | 否 |
| 设 ACCESS_PASSWORD + 匿名 curl API | **放行（漏洞）** | 401 | 预期修复 |
| 只设 PREMIUM_PASSWORD（none 模式）premium API | 放行 | 放行 | 否 |
| 设 ACCESS_PASSWORD 的 premium API | 放行 | 需 session（premium 是 access 之上隔离） | 符合产品语义 |
| `<video>` 同源请求 `/api/proxy` | 放行 | 带 cookie 放行 | 否 |
| 跨源 OPTIONS 预检 | 各路由返回 204 | middleware 放行 → 路由 204 | 否 |
| `/api/auth/accounts/*` | 路由自验 super_admin | middleware 验 session 通过 + 路由自验角色 | 否 |

## 风险与规避

- **R1 middleware 误拦导致全站 401**：通过“none 放行 + auth 端点白名单 + OPTIONS 放行 + 无密钥放行”四道兜底；任何判断失败默认 `next()` 而非 401（fail-open 保可用，符合“源稳定性优先”）。
- **R2 验签密钥与 auth.ts 不一致**：`resolveSessionSecretFromEnv` 严格按 `auth.ts:247-257` 复刻；用单元测试断言两种模式派生结果与原逻辑字符一致。
- **R3 流式 `/api/proxy` 过 middleware 性能**：单次 HMAC verify 微秒级；matcher 已排除静态分片，业务请求量可接受。
- **R4 edge 构建**：middleware 不 import `auth.ts`（含 `@upstash/redis` + `server-only`），仅 import `auth-helpers`（纯 WebCrypto）+ `session-edge`（纯 env）。

## 不做（out-of-scope）

- 不做角色/权限判断（middleware 只验 session 存在 + 未过期）。
- 不做滑动续期 / token 重签。
- 不改 `PasswordGate`、不改任何业务路由内部逻辑。
- 不新增独立登录页。
