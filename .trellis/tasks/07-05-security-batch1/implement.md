# Implement — 安全批次1

执行顺序按"低风险 → 高风险 → 验证"排列，每步可独立验证。每步完成后跑对应验证再进入下一步。

## 1. R1 + R2 — proxy 路由（最低风险，纯删/改响应体）

- [ ] `app/api/proxy/route.ts`：`forwardHeaders` 改为 `['range']`。
- [ ] 同文件 catch 分支 500 响应体改为 `{ error: 'Proxy request failed' }`，移除 `message` / `url`。
- [ ] 验证：`npx tsc --noEmit`；本地起服务，携带 cookie 请求 `/api/proxy?url=<测试地址>`，确认上游（测试地址）收到的请求头无 `cookie`；触发上游 5xx 确认响应体无 `url`/`message`。

## 2. R3 — fetchWithRetry 收敛出站头

- [ ] `lib/utils/fetch-with-retry.ts`：删除 `forwardedIP` 读取（含默认值 `202.108.22.5`）。
- [ ] `referer` 移除 `searchParams.get('referer') ||`，固定为上游域。
- [ ] 出站 headers 删除 `'X-Forwarded-For'`、`'Client-IP'`、`'Origin'` 三项。
- [ ] 验证：`npx tsc --noEmit`；grep 确认 `searchParams.get('ip')` / `searchParams.get('referer')` / `X-Forwarded-For` / `Client-IP` 在该文件已消失；本地播放一个已知视频源确认可播（回归 R3 风险）。
- [ ] **回滚点**：若播放回归失败，先单独恢复 `'Origin'` 一行再测；仍失败则整体 revert R3 待评估。

## 3. R4 — search-parallel 源封顶

- [ ] `app/api/search-parallel/route.ts`：新增 `const MAX_SOURCES = 50;`。
- [ ] 将 `request.json()` 与 `sources` 提取、`normalizedQuery` 计算前置到 POST 顶层（`ReadableStream` 创建之前）；`sources.length > MAX_SOURCES` 时 `return NextResponse.json({ error: 'Too many sources' }, { status: 400 })`。
- [ ] 流内复用顶层已解析的 `body` / `normalizedQuery` / `sources`（移除流内重复解析）；保留空 sources / invalid query 的既有错误处理（改为顶层返回或在流内保持，视前置后结构而定，优先不改变既有错误文案）。
- [ ] 验证：`npx tsc --noEmit`；curl 提交 51 个 sources 的 body 确认返回 400 且无出站；提交正常 body 确认搜索流式仍正常。

## 4. R5 — 端点补限流

按 design.md 配额表，对以下端点在 handler 入口（参数校验之前）加 `getClientIp` + `rateLimit` + 429 返回：

- [ ] `app/api/detail/route.ts` — `detail` 60/60s
- [ ] `app/api/probe-resolution/route.ts` — `probe` 10/60s
- [ ] `app/api/iptv/stream/route.ts` — `iptv-stream` 60/60s
- [ ] `app/api/douban/image/route.ts` — `douban-img` 120/60s
- [ ] `app/api/douban/recommend/route.ts` — `douban-rec` 30/60s
- [ ] `app/api/auth/accounts/route.ts` — `acct` 10/60s（同时覆盖其下的 `[accountId]/route.ts` 若也暴露写操作 —— 实现时确认）
- [ ] `app/api/user/sync/route.ts` — `sync` 30/60s
- [ ] 验证：`npx tsc --noEmit`；对 `probe-resolution` 与 `auth/accounts` 用 curl 连打确认超限返回 429 且带 `Retry-After`；确认正常使用频率不被误限。

## 5. 测试与质量闸

- [ ] 评估 `fetchWithRetry` / `proxy` 可测性：若可直接 mock 全局 `fetch`，则新增 `tests/proxy-headers.test.ts` 断言出站头无 XFF/Client-IP；否则在 implement.jsonl 标注该项靠手动 AC 验证。
- [ ] `npm test` 全绿（现有 12 个测试 + 任何新增）。
- [ ] `npx tsc --noEmit` 全绿。
- [ ] 不跑 `npm run lint`（已知历史 any 噪音、CI 不阻断）。

## 6. 手动回归（AC8）

- [ ] 视频播放（VOD 代理走 `/api/proxy`）：正常起播、切源、进度条。
- [ ] IPTV 直播（走 `/api/iptv/stream`）：频道切换、播放。
- [ ] 搜索：正常关键词流式结果、源延迟显示。
- [ ] 详情页：详情拉取、演员点击。
- [ ] 首页：豆瓣推荐、海报图加载（`/api/douban/image`）。

## Review Gate

实现完成后、提交前，对照 `prd.md` 的 AC1–AC8 逐条勾选；任一未达标回到对应步骤。AC6/AC7 必须通过；AC8 手动回归至少覆盖播放（VOD + IPTV）与搜索两条主路径。

## 完成判定

全部 AC 勾选 + 通过质量闸 + 手动回归 → 进入 Trellis 收尾（update-spec / commit / archive），按 MEMORY 约定不跳步。
