# A3 技术设计

## 限流算法：固定窗口

- Redis：`INCR ratelimit:<key>`，首次 `EXPIRE <windowSec>`；`count <= limit` 即放行。简单、低开销、跨实例一致；窗口边界有少量误差，防暴力足够。
- 内存降级：`Map<key, {count, resetAt}>`，`resetAt` 到期重置；定期清理避免无限增长。

## 文件设计 `lib/server/rate-limit.ts`

| 导出 | 说明 |
|---|---|
| `rateLimit(key, {limit, windowSec})` | 主接口，Redis 优先，失败/无 Redis 走内存 |
| `getClientIp(request)` | xff 首段 → request.ip → 'unknown' |
| `RateLimitResult` | `{ success, remaining, retryAfter }` |

Redis 客户端获取复刻 `lib/server/auth.ts:85-99` 的 `getRedisClient`（独立私有，避免互相 import）；加 `try/catch` 兜底 `Redis.fromEnv()` 抛错。

## 接入点

| 路由 | 位置 | key | 阈值 |
|---|---|---|---|
| `POST /api/auth` | POST 体首行（body 解析前） | `login:<ip>` | 10/60s |
| `GET /api/proxy` | runtimeFeatures 校验后、url 校验旁 | `proxy:<ip>` | 120/60s |
| `POST /api/search-parallel` | POST 首行（ReadableStream 创建前） | `search:<ip>` | 30/60s |

search-parallel 的 429 必须在 `new ReadableStream(...)` 之前返回普通 JSON，避免 SSE 流启动后再 429。

## 兼容性

- 限流通过 → 路由完全不变。
- 无 Redis（多数 Docker 自托管）→ 内存限流生效，单进程准确。
- Redis 故障 → try/catch 降级内存，限流不中断。
- xff 可伪造：客户端可换 IP 绕过，但配合 A2 的 session 鉴权（managed/legacy 模式下未登录 401），匿名滥用面已被 A2 收口；限流主要防单 IP 暴力。

## 不做

- 不做滑动窗口 / 令牌桶（固定窗口足够，避免过度设计）。
- 不做按 session 维度限流（IP 维度已满足验收；session 维度增加复杂度且 A2 已挡匿名）。
- 不做全局 rate limit 中间件（按端点精细控制阈值更合理）。
