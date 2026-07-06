# 执行计划：豆瓣推荐限流优化与缓存命中跳过计数

执行顺序自上而下，每步带验证；验证不过不进入下一步。

## 1. 新增缓存模块

新建 `lib/server/douban-cache.ts`：

- 模块内自持 Redis 单例（参照 `rate-limit.ts` 的 `getRedis` 模式，不从 `auth/runtime` 引入）。
- `buildRecommendationCacheKey({ type, tag, pageStart, pageLimit })`：产出 `douban-rec:cache:{type}:{encodeURIComponent(tag)}:{pageStart}:{pageLimit}`。
- `getCachedRecommendation(key)`：Redis 命中返回字符串，否则 / 无 Redis / 异常 → `null`。
- `setCachedRecommendation(key, body)`：`SET ... EX 1800`；无 Redis / 异常 → 空操作。
- 类注释含作者 `AceCandy`；字段/私有方法加中文注释。

验证：`npm test`（先跑新增的 douban-cache 单测，见第 4 步；此步可先写模块再补测）。

## 2. 改造 recommend 路由

编辑 `app/api/douban/recommend/route.ts`，按 design 的新顺序重排：

- 入口计算 `cacheKey`。
- `getCachedRecommendation(cacheKey)` 命中 → `NextResponse.json(JSON.parse(body))` 直接返回。
- 未命中 → `rateLimit(\`douban-rec:${ip}\`, { limit: 200, windowSec: 60 })`，超限仍返回 429。
- 通过 → 原有 fetch + cover 改写逻辑保留 → `setCachedRecommendation(cacheKey, body)` → 返回。

验证：单测覆盖「命中跳过 fetch / 跳过 rateLimit」与「未命中走完整流程」；人工核对响应体含 cover 代理 URL。

## 3. 放宽阈值（并入第 2 步）

`limit: 30` → `limit: 200`，`windowSec` 不变。

验证：限流单测确认新阈值行为（沿用 `tests/rate-limit.test.ts` 的内存降级路径构造用例）。

## 4. 补充单测

新建 `tests/douban-cache.test.ts`，沿用 `node:test` + `assert/strict` + 删除 env 走内存降级的风格，覆盖：

- `buildRecommendationCacheKey` 对中文 tag 正确编码、不同参数产出不同 key。
- 无 Redis 时 `getCachedRecommendation` 返回 `null`、`setCachedRecommendation` 不抛错。

验证：`npm test` 全量通过。

## 5. 整体校验

- `npm test`：含 `tests/rate-limit.test.ts`、`tests/douban-cache.test.ts` 全部通过。
- `npm run lint`：无新增告警。
- 确认未引入 `lib/server/auth/runtime` 依赖、未改动 `rate-limit.ts`、未改动 image/tags 路由。

## Review Gates

- 缓存命中：不调用豆瓣 fetch、不消耗限流额度（核心目标）。
- 无 Redis 降级：路由按 A 新阈值在入口计数，功能不中断。
- 阈值生效：200/min，超限 429。

## Rollback

`git revert` 相关提交；手动确认 `lib/server/douban-cache.ts` 已移除、recommend 路由顺序还原、阈值回到 30。
