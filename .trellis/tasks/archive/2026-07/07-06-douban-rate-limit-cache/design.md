# 技术设计：豆瓣推荐限流优化与缓存命中跳过计数

## 方案 A：放宽限流阈值

`app/api/douban/recommend/route.ts` 中 `rateLimit(..., { limit: 30, windowSec: 60 })` 调整为 `{ limit: 200, windowSec: 60 }`。

依据：豆瓣侧已由 `next:{ revalidate: 3600 }` 做边缘缓存兜底，真正回源的请求量极小；30/min 对「单次首页最多 6 并发」的合法用法过苛。200/min 仍足以拦住异常爬虫。

## 方案 B1：应用层缓存 + 限流位置调整

### 为什么不用 Next fetch cache 实现「命中不计数」

Next.js Edge runtime 下 `fetch(url, { next:{ revalidate } })` 的 Data Cache 不向路由代码暴露「本次是否命中」的同步信号，无法在 `rateLimit()` 之前判断「是否会真打到豆瓣」。因此 B 只能通过**应用层显式缓存**实现：命中即短路返回并跳过限流，未命中才计数 + 回源。

### 新增模块 `lib/server/douban-cache.ts`

职责：封装 recommend 响应的读缓存 / 写缓存，自持 Redis 单例，无 Redis 或 Redis 故障时安全降级。

公开接口（概念）：

- `getCachedRecommendation(key)`：命中返回缓存字符串，未命中/降级返回 `null`。
- `setCachedRecommendation(key, body)`：写入并设 TTL；降级时为空操作。
- `buildRecommendationCacheKey({ type, tag, pageStart, pageLimit })`：构造缓存 key。

实现要点：

- Redis 单例：模块内 `let cachedRedis: Redis | null | undefined`，按 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` 是否存在决定，复用 `rate-limit.ts` 既有模式，**不**从 `auth/runtime` 引入（隔离原则）。
- key 格式：`douban-rec:cache:{type}:{tag}:{pageStart}:{pageLimit}`。`tag` 经 `encodeURIComponent` 归一化，避免中文 / 特殊字符污染 key。与限流 key `ratelimit:douban-rec:{ip}` 处于不同前缀，命名空间隔离。
- TTL：1800 秒（30 分钟）。与上游 `revalidate:3600` 同量级，偏短以保证首页内容新鲜度。
- 读/写均 `try/catch`：Redis 异常当 MISS / 空操作，不抛错、不阻断主流程。
- value：直接缓存最终 JSON 字符串（`cover` 已改写为代理 URL，结果确定性、与请求方无关，可安全复用）。

### recommend 路由流程重排

原顺序：`入口 → rateLimit → fetch 豆瓣 → 改写 cover → 返回`

新顺序：

```
入口
 → 计算 cacheKey
 → getCachedRecommendation(cacheKey)
      命中 → 直接返回（跳过 rateLimit、跳过 fetch）
 → rateLimit(douban-rec:{ip}, { limit: 200, windowSec: 60 })
      超限 → 429 + Retry-After
 → fetch 豆瓣（保留 next:{ revalidate: 3600 }）
 → 改写 cover 为代理 URL
 → setCachedRecommendation(cacheKey, body)
 → 返回
```

### 与 fetch revalidate 的关系

保留 `fetch(url, { next:{ revalidate: 3600 } })`。它作用于 fetch 层（边缘节点缓存回源结果），与应用层 Redis 缓存正交：即便 Redis 未命中或无 Redis，fetch 层仍能减少对豆瓣的真实请求。两层互不干扰。

### 降级矩阵

| 部署环境 | 应用层缓存 | 限流位置 | 实际效果 |
|---|---|---|---|
| 配置 Redis | 生效（命中跳过计数） | 未命中分支计数 | 正常用户几乎不撞限；上游压力低 |
| 未配置 Redis | 失效（getRedis 返回 null，读返回 null、写空操作） | 入口计数（A 新阈值） | 仅 A 生效；fetch revalidate 兜底 |
| Redis 故障 | 读当 MISS、写忽略 | 入口计数（A 新阈值） | 同上，不阻断请求 |

## 兼容性与回滚

- 纯新增模块 + 路由内顺序调整，无对外契约变化；缓存对前端透明（响应体不变）。
- 回滚：`git revert` 即可——还原路由顺序、删除 `lib/server/douban-cache.ts`、阈值改回 30。

## 不在本次范围

- `douban/image`、`douban/tags` 路由的限流与缓存。
- 前端请求合并 / 串行化（`usePersonalizedRecommendations` 的并发查询数）。
- 限流算法升级（固定窗口 → 滑动窗口）。
