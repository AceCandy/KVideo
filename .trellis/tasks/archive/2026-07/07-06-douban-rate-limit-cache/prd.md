# 豆瓣推荐限流优化与缓存命中跳过计数

## Goal

解决首页多次刷新触发 `douban-rec` 429 的问题：放宽推荐接口限流阈值，并引入应用层缓存，使命中缓存的请求不消耗限流额度。

## Background

- `app/api/douban/recommend/route.ts` 当前限流 `douban-rec` 为 30 次/60 秒。
- 有 ≥2 条观看历史的用户，一次首页加载会并发最多 6 个 recommend 请求（1 个 `usePopularMovies` + 最多 5 个 `usePersonalizedRecommendations`，后者来自 `generateRecommendations().slice(0,5)`）。
- 限流在路由入口执行，先于豆瓣 `fetch({ next:{ revalidate: 3600 } })`。即使同 tag 命中边缘缓存，限流额度照涨——边缘缓存省了上游带宽，没省限流额度。
- 叠加 `reactStrictMode: true`，dev 模式下 useEffect 双发，2–3 次刷新即撞限；生产约 5 次。

## Requirements

- **A 放宽阈值**：`douban-rec` 限流由 30/min 提升至 200/min，窗口不变；超限仍返回 429 + `Retry-After`。
- **B 缓存命中跳过计数**：为 recommend 路由新增应用层缓存；命中缓存时直接返回且**不计入限流**；未命中才执行限流 → 回源豆瓣 → 写回缓存。
- **降级**：未配置 Upstash Redis 时，缓存层自动失效，路由回退到「入口限流（A 的新阈值）+ fetch revalidate 兜底」的原语义，功能不中断。
- **范围约束**：只动 recommend 路由；不改动 `douban/image`、`douban/tags` 路由，不改动前端请求逻辑。
- **隔离约束**：缓存模块自持 Redis 单例，不依赖 `lib/server/auth/runtime`，不污染 `rate-limit.ts` 的既有逻辑。

## Acceptance Criteria

- [ ] 同 `type+tag+pageStart+pageLimit` 的请求：首次回源并写缓存；30 分钟内重复请求命中缓存、不调用豆瓣 `fetch`、不消耗 `douban-rec` 限流额度。
- [ ] `douban-rec` 限流阈值为 200/min；超过后正确返回 429 与 `Retry-After`。
- [ ] 缓存命中返回的响应体与原响应一致（含 `cover` 已改写为 `/api/douban/image?url=...` 代理 URL）。
- [ ] 限流 key（`ratelimit:douban-rec:{ip}`）与缓存 key 命名空间隔离，互不污染。
- [ ] 未配置 Redis 时：缓存层跳过，限流按 A 的新阈值在入口生效，路由功能正常，无报错。
- [ ] 新增缓存逻辑有单测覆盖（命中 / 未命中 / 无 Redis 降级 / Redis 故障当 MISS）；`tests/rate-limit.test.ts` 保持通过。
- [ ] 改动兼容 edge runtime，构建不报错。

## Constraints

- edge runtime 兼容：仅用 `@upstash/redis`（REST，已支持 edge），不引入 node 专有模块。
- 不改动既有 SSRF / 限流 / 限流降级语义。
- 缓存仅缓存豆瓣固定 URL 的响应（recommend 不接受用户可控 URL，无需 SSRF）。
