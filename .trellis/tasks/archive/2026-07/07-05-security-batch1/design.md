# Design — 安全批次1

## 改动总览

| 项 | 文件 | 性质 |
|---|---|---|
| R1 移除 cookie 转发 | `app/api/proxy/route.ts` | 删 1 个数组元素 |
| R2 错误响应脱敏 | `app/api/proxy/route.ts` | 改 catch 分支响应体 |
| R3 收敛可注入出站头 | `lib/utils/fetch-with-retry.ts` | 删 `?ip=` / `?referer=` 读取与 XFF/Client-IP 写入 |
| R4 搜索源封顶 | `app/api/search-parallel/route.ts` | body 解析前置 + 上限校验 |
| R5 端点补限流 | `app/api/{detail,probe-resolution,iptv/stream,douban/image,douban/recommend,auth/accounts,user/sync}/route.ts` | 入口加 rateLimit |

## R1 / R2 — proxy 路由

`app/api/proxy/route.ts`：

- **R1**：`forwardHeaders` 由 `['cookie', 'range']` 改为 `['range']`。`range` 是分段视频分片必需（206 Partial Content），保留；`cookie` 对上游无业务必要，移除后 `kvideo_session` / `kvideo_premium` 不再外泄。
- **R2**：catch 分支（当前 line 141-154）的 500 响应体移除 `message` 与 `url` 字段，改为固定 `{ error: 'Proxy request failed' }`。日志侧（line 140 `reportError(error, { url: sanitizeUrlForLog(url) })`）保持不变 —— 详情仍进日志，不回客户端。
- SSRF 拒绝分支（line 134-138）已是脱敏固定文案，不动。
- 上游非 OK 透传分支（line 63-72）保持原状：透传上游自身响应体是 proxy 的正常职责，不属于本站泄漏。

## R3 — fetchWithRetry 收敛出站头

`lib/utils/fetch-with-retry.ts`：

- 删除 `forwardedIP = request.nextUrl.searchParams.get('ip') || '202.108.22.5'`（line 24）。
- `referer` 改为固定 `${videoUrl.protocol}//${videoUrl.hostname}`，移除 `request.nextUrl.searchParams.get('referer') ||` 的客户端覆盖能力（line 21）。反封锁行为与现状 fallback 完全一致。
- 出站 fetch headers（line 46-61）移除 `'X-Forwarded-For'` 与 `'Client-IP'` 两项；`Origin` 同样移除（当前 line 57 伪造为上游域，与 XFF 同属身份冒充头）。其余反封锁头（UA、Accept、Accept-Language、Referer、Sec-Fetch-*）保留。
- 保留 `User-Agent` 轮换 —— 这是反封锁必需，且不构成身份冒充。

**边界判断**：`Origin` 移除存在与 R3 风险项相同的回归可能（个别源校验 Origin）。但 `Origin` 与 `Referer` 同时存在时，多数源看 `Referer`；移除 `Origin` 让请求表现为"非浏览器发起"，反而更像普通播放器客户端。若回归出现，单独回退 `Origin` 一项即可（已在 implement.md 标注回滚点）。

## R4 — search-parallel 源数量封顶

`app/api/search-parallel/route.ts`：

- 现状：`request.json()` 在 `ReadableStream.start` 内执行（line 47），此时 HTTP 响应已开始（无法返回 400）。
- 改法：将 body 解析与 `sources` 提取、上限校验**前置到 POST 函数体顶层**（创建 `ReadableStream` 之前）。校验失败直接 `return NextResponse.json({ error: 'Too many sources' }, { status: 400 })`，不创建流、不发任何出站请求。
- 解析后的 `body` / `normalizedQuery` / `sources` 通过闭包传入 `ReadableStream.start`。
- 新增常量 `const MAX_SOURCES = 50;`（仓库默认源 + 用户源 + premium 源 + 订阅导入，50 留余量；50 × 3 页 = 150 子请求，远低于边缘运行时配额）。
- 现有 `MAX_TOTAL_VIDEOS` / `MAX_PAGES_PER_SOURCE` / 限流（`search:${ip}` 30/60s）保持不变。

## R5 — 端点限流配额

接入模式统一参考 `proxy/route.ts:28-42`：`const ip = getClientIp(request); const rl = await rateLimit(\`${scope}:${ip}\`, { limit, windowSec }); if (!rl.success) return 429 + Retry-After`。`getClientIp` / `rateLimit` 已从 `@/lib/server/rate-limit` 导出。

配额分级（初始值，可据 AC8 手动回归与线上表现调整）：

| 端点 | scope | limit / windowSec | 依据 |
|---|---|---|---|
| detail | `detail` | 60 / 60 | 单请求 ≤4 次出站；浏览详情频率中等 |
| probe-resolution | `probe` | 10 / 60 | 单批可触发数百子请求，最危险；按"播放器加载批次"限频 |
| iptv/stream | `iptv-stream` | 60 / 60 | 长连接流代理，与 proxy 同量级 |
| douban/image | `douban-img` | 120 / 60 | 海报批量加载，高频，与 proxy 同量级 |
| douban/recommend | `douban-rec` | 30 / 60 | 首页推荐，低频 |
| auth/accounts | `acct` | 10 / 60 | 账号 CRUD，敏感写 |
| user/sync | `sync` | 30 / 60 | 云同步写 |

- 各端点在**参数校验之前**就限流（与 proxy 一致：先限流、再处理），避免无效请求也消耗出站配额。
- 对原本只有 `GET` 的端点（如 `douban/image`、`douban/recommend`、`detail`），在 GET handler 入口加；对 `auth/accounts`（POST）、`user/sync`（POST）在 POST handler 入口加。
- `probe-resolution` 若既有单批上限（100 条），本批不调整单批上限，只加请求级限流；单批下调留待后续按线上的实际探测批次大小决定。

## 关键设计决策

1. **R4 解析前置而非流内校验**：AC4 要求超限返回 400，流内校验只能关闭已开始的流（HTTP 200），不满足验收。解析前置是必要的小重构，不改变流式渲染逻辑。
2. **R3 不删 `Referer`、只删其客户端覆盖能力**：`Referer = 上游域` 是反封锁必需；删除客户端 `?referer=` 覆盖能力即可消除注入，无需牺牲反封锁。
3. **R5 配额分级而非统一**：`probe-resolution` 与 `auth/accounts` 必须严（10/60s），`douban/image` 必须宽（120/60s），统一配额会要么误伤要么形同虚设。

## 验证策略

- 静态：`npx tsc --noEmit`。
- 单测：`npm test`。新增断言：
  - `tests/` 下新增 `proxy-headers.test`（或扩展现有）—— 单测 `fetchWithRetry` 出站 headers 不含 `X-Forwarded-For` / `Client-IP`，且不读 `?ip=`。需以可注入 fetch mock 的方式验证；若 fetchWithRetry 不易单测（直接调全局 fetch），则改为对 `proxy/route.ts` 的集成式断言或仅靠 AC1/AC3 手动验证，并在 implement.md 标注。
  - search-parallel 源封顶：若不易起 NextRequest 集成测，则靠 AC4 手动 curl 验证 + 代码评审。
- 手动回归（AC1/AC2/AC4/AC8）：本地 `npm run dev`，用 curl 或浏览器开发者工具验证 cookie 不外泄、500 脱敏、源封顶 400、播放/搜索/详情/豆瓣功能正常。

## 回滚

- 每项改动相互独立，可单独 revert。
- R3 的 `Origin` 移除是最高回归风险点：若播放回归发现个别源失效，单独恢复 `'Origin': ${videoUrl.protocol}//${videoUrl.hostname}` 一行，其余 XFF/Client-IP 移除保持。
- R5 配额误伤：调大对应端点 `limit` 即可，无需回退整个限流接入。
