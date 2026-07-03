# A2 鉴权与 session 加固

## Goal

在“不破坏匿名部署、不改变前端登录交互”的前提下，把后端 API 层从“前端 PasswordGate 锁屏、API 完全裸奔”升级为“none 模式匿名可用；legacy/managed 模式下非登录 API 强制有效 session”，并让 session token 在服务端具备独立过期校验。

## 背景

- 设了 `ACCESS_PASSWORD` 的部署，前端 `PasswordGate` 会锁屏，但 `/api/proxy`、`/api/search-parallel`、`/api/premium/*` 等业务 API **无任何 session 检查**，匿名可直接 `curl` 拿到数据。这是父战役验收标准第 3 条要堵的洞。
- `verifySessionToken`（`lib/server/auth-helpers.ts`）只验签 + 字段存在性，**不校验 `iat` 过期**；cookie 的 30 天 maxAge 仅由浏览器执行，cookie 一旦被导出，token 永久有效。
- 项目当前无 `middleware.ts`，鉴权全靠各路由自觉。

## Requirements

1. `verifySessionToken` 对超过 `SESSION_MAX_AGE_SECONDS` 的 token 一律返回 `null`，与服务端时钟绑定，绕过 cookie 过期。
2. 新增 `middleware.ts`：仅拦截 `/api/*`（页面访问由客户端 `PasswordGate` 处理，不在 middleware 范围）。
3. middleware 行为按部署模式分流：
   - `none` 模式（未配置任何访问密码 / managed 前置条件）→ 全放行，保持匿名可用。
   - `legacy_password` / `managed` 模式 → 除登录相关端点与 OPTIONS 预检外，要求有效 session cookie，否则 401。
4. 登录相关端点必须豁免：`/api/auth`（GET 配置 / POST 登录）、`/api/auth/session`（GET 状态 / DELETE 登出），否则锁屏前无法获取 `loginMode`，形成死锁。
5. premium 内容隔离不回归：仅设 `PREMIUM_PASSWORD`（`loginMode === 'none'`）的部署，`/api/premium/*` 仍匿名可用；设了 `ACCESS_PASSWORD` 的部署，premium API 纳入 session 强制（premium 是 access 之上的隔离，符合产品语义）。
6. middleware 必须 edge-runtime 可用：复用 WebCrypto 验签，不得 import 会拉入 `@upstash/redis` 或 `server-only` 的模块。

## Acceptance Criteria

- [ ] 构造 `iat` 早于 30 天前的 session token，`verifySessionToken` 返回 `null`；合法 `iat` 正常通过。
- [ ] `none` 模式下，匿名请求任意 `/api/*` 返回原响应（不被 401）。
- [ ] `legacy_password` / `managed` 模式下，匿名请求 `/api/search-parallel`、`/api/proxy`、`/api/premium/*` 返回 401；携带有效 session cookie 时返回原响应。
- [ ] `/api/auth`（GET/POST）、`/api/auth/session`（GET/DELETE）在任何模式下均不被 middleware 拦截。
- [ ] `/api/auth/accounts/*` 仍由路由自身要求 super_admin（middleware 不做角色判断）。
- [ ] OPTIONS 预检请求不被 middleware 拦截。
- [ ] middleware 不 import `lib/server/auth.ts`，构建产物保持 edge 兼容。
- [ ] `npx tsc --noEmit` 通过；`npm test` 全绿（含新增 session-edge / 过期校验用例）；现有行为零回归。

## 约束（用户已确认 / 父任务）

- 父 PRD 风险条款：“默认行为不得破坏现有匿名部署” → none 模式硬约束。
- 父 PRD 验收标准第 3 条：鉴权统一。
- 不去除伪造 IP 头、不关闭代理；A2 只加鉴权门，不改业务路由内部逻辑。
