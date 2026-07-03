# A4 执行清单

1. `next.config.ts`：removeConsole 改为 `{ exclude: ['error','warn'] }`（生产）。
2. `lib/server/observability.ts`（新建）：reportError / logAudit / parseSentryDsn / sanitizeUrlForLog。
3. `lib/server/url-guard.ts`：assertSafeOutboundUrl 外层 try/catch 包装记 `ssrf_blocked` 审计。
4. `app/api/auth/route.ts`：登录失败记 `login_failed`。
5. `app/api/auth/accounts/route.ts`：POST 成功记 `account_create`。
6. `app/api/auth/accounts/[accountId]/route.ts`：PATCH/DELETE 成功记 `account_update` / `account_delete`。
7. `app/api/proxy/route.ts`：500 catch 调 reportError（示例性接入）。
8. `tests/observability.test.ts`（新建）：parseSentryDsn / sanitizeUrlForLog / reportError 无 DSN 行为。

## 验证

- `npx tsc --noEmit` → exit 0
- `npm test` → 全绿（原 48 + 新增）

## 回滚

- 还原 next.config removeConsole；删除 observability.ts 与各接入点的单行调用；url-guard 还原为无外层包装。业务逻辑未改。
