# 安全批次1：会话劫持修复与限流加固

## Goal

修复全维度审查发现的后端/API 高危与中危安全问题：关闭会话凭证向任意上游的泄漏路径、收敛客户端可注入的出站请求头、为出站放大类与敏感类 API 补齐限流，使部署默认安全。

## Background

多维度审查（后端安全 agent + 工程化自查，已交叉取证）确认以下事实：

- `/api/proxy` 将调用方 Cookie（含 httpOnly 的 `kvideo_session`、`kvideo_premium`）整包转发给用户可控的上游 URL。配合"任意视频源 / IPTV 源可由用户自定义"的产品形态，构成会话劫持路径。
- `/api/proxy` 的 500 响应体回显完整上游 URL 与底层 `error.message`，且 CORS `*`，造成信息泄漏。
- `fetchWithRetry` 从查询参数读取 `ip`、`referer` 注入出站请求头（`X-Forwarded-For`、`Client-IP`、`Referer`），默认值 `202.108.22.5` 为真实公网 IP，允许客户端冒充来源身份。
- `/api/search-parallel` 不限制传入的源数量，单请求可触发上万次出站 fetch，可击穿边缘运行时子请求配额。
- `detail` / `probe-resolution` / `iptv/stream` / `douban/image` 等出站放大类端点，以及 `auth/accounts` / `user/sync` 等敏感写端点，未接入任何限流。

## Requirements

### 必做（本批交付）

- **R1 会话凭证不再外泄**：`/api/proxy` 转发给上游的请求头中不再包含 `cookie`，仅保留功能性 `range`。
- **R2 错误响应脱敏**：`/api/proxy` 异常分支不再向客户端回显上游 URL 与原始错误消息；详情仅进服务端日志（已用 `sanitizeUrlForLog`）。
- **R3 收敛客户端可注入的出站头**：`fetchWithRetry` 不再从查询参数读取 `ip` / `referer`；`X-Forwarded-For` / `Client-IP` 不再被写入上游请求；`Referer` 固定采用上游域名（保留既有反封锁行为）。
- **R4 搜索源数量封顶**：`/api/search-parallel` 对入参 `sources.length` 设硬上限，超限直接 400 拒绝，不进入流式处理。
- **R5 放大类与敏感类端点补限流**：下列端点接入 `rateLimit`（IP 维度），配额按风险分级（见 design.md）：
  - 出站放大类：`detail`、`probe-resolution`、`iptv/stream`、`douban/image`、`douban/recommend`
  - 敏感写类：`auth/accounts`、`user/sync`

### 不做（明确排除，留待后续批次）

- XFF 可信代理链改造（涉及部署形态判断）。
- 密码 / hash 恒定时间比较（需引入 HMAC 包装，独立设计）。
- `url-guard` DNS rebinding 架构级加固。
- `next.config.ts` images 通配收窄（属配置治理，独立任务）。

### 可选附加（低成本，实现时若顺手则纳入，否则跳过）

- `/api/douban/image` 限制 host 为 `*.doubanio.com` / `*.douban.com`。
- `/api/user/sync` 限制请求 body 字节数上限。

## Acceptance Criteria

- [ ] AC1：以携带 `kvideo_session` 的请求调用 `/api/proxy?url=<攻击者控制的地址>`，上游收到的请求头中不含 `cookie`。
- [ ] AC2：触发 `/api/proxy` 上游异常，响应体不含原始 `url` 字段与 `error.message`，仅含固定文案。
- [ ] AC3：`fetchWithRetry` 源码中不再出现从 `searchParams.get('ip')` / `searchParams.get('referer')` 读取并写入出站头的逻辑；出站请求不含 `X-Forwarded-For` / `Client-IP`。
- [ ] AC4：向 `/api/search-parallel` 提交 `sources.length` 超过上限的 body，返回 400 且不发起任何出站请求。
- [ ] AC5：R5 所列端点均接入 `rateLimit`；超出配额返回 429 且带 `Retry-After`。
- [ ] AC6：`npx tsc --noEmit` 通过。
- [ ] AC7：`npm test` 通过（含新增的限流 / 源封顶断言）。
- [ ] AC8：现有受影响功能（视频播放代理、IPTV 代理、搜索、详情、豆瓣推荐）在合理配额下不被误限，手动回归通过。

## Validation Status

- AC1 ✅ 代码：`proxy/route.ts` `forwardHeaders=['range']`。
- AC3 ✅ 单测：`tests/fetch-with-retry.test.ts` 3 例（无 XFF/Client-IP/Origin、`?ip=`/`?referer=` 注入失效、Range 仍转发）。
- AC6 ✅ `npx tsc --noEmit` 通过。
- AC7 ✅ `npm test` 67 例全绿。
- AC4 ⚠ 代码确认（`MAX_SOURCES=50` → 400）；HTTP 端点级未复测（middleware 在认证前拦截）。
- AC5 ⚠ 11 个 handler 接入（含 `[accountId]` PATCH/DELETE）；HTTP 端点级未复测（同上）。
- AC2 ⚠ 代码确认（删 `message`/`url`）；HTTP 端点级未复测（同上）。
- AC8 ❌ 待用户在已认证环境回归播放（VOD+IPTV）/ 搜索 / 详情 / 豆瓣。

## Risks

- **R3 回归风险**：部分视频源可能依赖被代理请求携带的特定 `Referer` / `X-Forwarded-For` 才放行。`Referer` 固定为上游域名（与现状 fallback 一致）可覆盖大部分；移除 `X-Forwarded-For` / `Client-IP` 理论上不影响播放（这些头主要用于上游限流/地理识别，非必要）。需在实现后对已知源做播放回归。
- **R5 配额误伤**：限流配额过低会误伤正常用户的高频操作（如全源分辨率探测）。配额需参考现有 `proxy: 120/60s` 的量级，并在 design.md 给出分级表。
- **边缘运行时约束**：所有改动须兼容 `runtime = 'edge'`（Cloudflare Pages / Vercel Edge），不引入 Node 专属 API。
