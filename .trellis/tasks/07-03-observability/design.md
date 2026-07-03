# A4 技术设计

## 日志分级

`next.config.ts:10` 当前 `removeConsole: NODE_ENV==='production'`（剥离所有 console）。改为 `{ exclude: ['error', 'warn'] }`，生产保留 error/warn，剥离 debug/info/log。审计日志走 warn、错误走 error，均得以保留。

## observability.ts 设计

| 导出 | 行为 |
|---|---|
| `reportError(error, context?)` | 结构化 `console.error`（始终）+ DSN 配置时 POST envelope（尽力而为，失败静默） |
| `logAudit(event, details?)` | 结构化 `console.warn`，`audit:true` 标记 |
| `parseSentryDsn(dsn)` | DSN → `{url: origin/api/<projectId>/envelope/, publicKey}`；非法 null |
| `sanitizeUrlForLog(rawUrl)` | 去 query/fragment，保留 origin+pathname；解析失败截断 |

Sentry envelope 最小格式（3 行 NDJSON）：header `{event_id,sent_at}` / item header `{type:'event'}` / event body。POST 到 ingest URL，带 `X-Sentry-Auth`。GlitchTip 兼容此协议。`crypto.randomUUID` / `new Date()` 在 node/edge runtime 均可用（observability 仅用于 server 路由，非 workflow 脚本）。

## SSRF 审计下沉

`url-guard.ts` 的 `assertSafeOutboundUrl` 当前有多个分散 throw 点（协议/主机名/IPv4/IPv6/DNS）。用外层 try/catch 包装：核心逻辑移入 `assertSafeOutboundUrlImpl`，外层捕获 `SsrfGuardError` 后 `logAudit('ssrf_blocked', { url: sanitizeUrlForLog(rawUrl), reason })` 再 rethrow。一处包装覆盖全部 8 个路由的 SSRF 拦截，零路由改动。

## 接入点

| 位置 | 事件 | details |
|---|---|---|
| `assertSafeOutboundUrl` 外层 catch | `ssrf_blocked` | `{ url: sanitized, reason }` |
| `/api/auth` POST 登录失败分支 | `login_failed` | `{ ip, username? }`（无密码） |
| `/api/auth/accounts` POST 成功 | `account_create` | `{ accountId, username }` |
| `/api/auth/accounts/[id]` PATCH 成功 | `account_update` | `{ accountId }` |
| `/api/auth/accounts/[id]` DELETE 成功 | `account_delete` | `{ accountId }` |
| `/api/proxy` 500 catch（示例性） | `reportError` | `{ url: sanitized }` |

## 兼容性

- 无 DSN：reportError 退化为结构化 console.error，零外部依赖。
- next.config 改动仅影响生产 console 剥离范围，开发环境不变。
- url-guard 外层包装对调用方完全透明（仍抛 SsrfGuardError）。

## 不做

- 不接入 `@sentry/nextjs`、不配置构建期 source map 上传。
- 不做日志聚合 / 日志轮转（由部署环境的日志驱动接管）。
- 不为每个路由 500 都接 reportError（仅 proxy 作示例性接入；其余靠结构化 console.error + next.config 保留）。
