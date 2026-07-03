# A3 执行清单

1. `lib/server/rate-limit.ts`（新建）：`rateLimit` + `getClientIp` + 内存降级。
2. `app/api/auth/route.ts`：POST 首行加 `login:<ip>` 限流，429 返回 `valid:false`。
3. `app/api/proxy/route.ts`：runtimeFeatures 校验后加 `proxy:<ip>` 限流。
4. `app/api/search-parallel/route.ts`：POST 首行（stream 前）加 `search:<ip>` 限流。
5. `tests/rate-limit.test.ts`（新建）：内存限流通过/超限/窗口重置 + getClientIp 解析。

## 验证

- `npx tsc --noEmit` → exit 0
- `npm test` → 全绿（原 42 + 新增）

## 回滚

- 删除接入点的 4-6 行调用 + 新增模块/测试即可；路由业务逻辑未改。
