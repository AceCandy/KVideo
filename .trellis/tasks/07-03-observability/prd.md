# A4 可观测性与审计日志

## Goal

在生产环境保留 error/warn 日志，提供结构化错误上报（可选 Sentry/GlitchTip）与关键安全事件审计日志，使自托管实例具备“能排障、能追溯”的可观测基线。

## Requirements

1. `next.config.ts` 的 `removeConsole` 改为生产环境保留 `error`/`warn`（当前剥离全部）。
2. 新增 `lib/server/observability.ts`：
   - `reportError(error, context?)`：始终输出结构化 `console.error`；配置 `SENTRY_DSN` 或 `GLITCHTIP_DSN` 时额外 POST Sentry 兼容 envelope；上报失败静默。
   - `logAudit(event, details?)`：结构化 `console.warn`，标记 `audit:true`。
   - `parseSentryDsn`、`sanitizeUrlForLog` 辅助。
3. 审计接入（`logAudit`，不含明文密码/token）：
   - SSRF 拦截：在 `assertSafeOutboundUrl` 内统一记 `ssrf_blocked`（覆盖全部 8 个路由拦截点）。
   - 登录失败：`/api/auth` 记 `login_failed`（含 IP，不含密码）。
   - 账号增删改：`/api/auth/accounts*` 记 `account_create` / `account_update` / `account_delete`。
4. 不强制依赖外部服务：无 DSN 时降级为纯结构化日志。

## Acceptance Criteria

- [ ] 生产构建保留 `console.error` / `console.warn`（next.config exclude 配置正确）。
- [ ] `parseSentryDsn`：合法 DSN 解析出 ingest URL + publicKey；非法返回 null。
- [ ] `sanitizeUrlForLog`：去除 query/fragment，保留 origin+pathname。
- [ ] `reportError` 无 DSN 时仅 console.error，不发起网络请求。
- [ ] SSRF 拦截产生 `audit:ssrf_blocked` 日志；登录失败产生 `audit:login_failed`；账号增删改产生对应审计日志。
- [ ] `npx tsc --noEmit` 通过；`npm test` 全绿；现有行为零回归。

## 约束

- 不引入 `@sentry/nextjs`（避免重依赖与构建期注入）；手动实现最小 Sentry envelope（GlitchTip 兼容）。
- 自托管默认无 DSN → 纯结构化日志（符合父 PRD 风险条款）。
- 审计日志 details 禁止含密码、token、完整带参 URL。
