# A3 限流（rate limit）

## Goal

为登录、媒体代理、并行搜索三类高风险端点加入出站/认证速率限制，防止登录暴力、API 滥用与出站放大攻击；在无 Redis 的自托管环境下仍提供单实例级别的兜底限流。

## Requirements

1. 新增 `lib/server/rate-limit.ts`：统一限流接口 `rateLimit(key, {limit, windowSec})`，固定窗口算法。
2. 优先使用 `@upstash/redis`（INCR + EXPIRE，跨实例准确）；无 Redis 或 Redis 故障时降级为进程内 Map（单实例有效，多实例宽松）。
3. 提供 `getClientIp(request)`：从 `x-forwarded-for` 首段取，回退 `request.ip`，再回退 `'unknown'`。
4. 接入点与阈值：
   - `POST /api/auth`：`login:<ip>`，10 次/60 秒（含 premium 密码尝试）。
   - `GET /api/proxy`：`proxy:<ip>`，120 次/60 秒（视频分片高频，宽松）。
   - `POST /api/search-parallel`：`search:<ip>`，30 次/60 秒。
5. 超限返回 429 + `Retry-After` 头，登录端点额外返回 `valid:false`。
6. 不破坏现有行为：限流通过时路由逻辑零变化。

## Acceptance Criteria

- [ ] 内存限流：连续请求至超限返回 `success:false`；窗口过期后恢复。
- [ ] `getClientIp`：多段 xff 取首个；无 xff 且无 `request.ip` 时返回 `'unknown'`。
- [ ] 三端点超限返回 429（search-parallel 在 SSE 流建立前返回）。
- [ ] 未配置 Redis 环境下，限流仍生效（内存降级）。
- [ ] `npx tsc --noEmit` 通过；`npm test` 全绿；现有行为零回归。

## 约束

- 不引入 `@upstash/ratelimit`（减少依赖）；复用已装的 `@upstash/redis`。
- 主战场 Docker 自托管（Node runtime，常单实例），内存限流对其有效；Edge 多实例下内存限流宽松可接受，有 Redis 时以 Redis 为准。
- 不去除伪造 IP 头（`lib/utils/fetch-with-retry.ts`）——那是出站伪装，与本限流（入站客户端 IP）无关。
