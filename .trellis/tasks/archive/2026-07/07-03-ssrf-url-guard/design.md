# A1 技术设计

## url-guard API

`lib/server/url-guard.ts` 导出：

- `assertSafeOutboundUrl(url: string): Promise<void>` — async，校验失败抛 `SsrfGuardError`。
- `class SsrfGuardError extends Error`（含 `reason` 字段，供日志）。
- 纯函数（可单测）：`isAllowedProtocol(scheme)`、`isBlockedHostname(host)`、`isPrivateIPv4(octets)`、`isPrivateIPv6(groups)`。

## 校验链（顺序）

1. `new URL(url)` 解析，失败 → reject。
2. 协议白名单：仅 `http:` / `https:`，否则 reject（拦 `file:`、`ftp:`、`gopher:` 等）。
3. hostname 小写化。
4. hostname 黑名单：`localhost`、`*.local`、`*.internal`、`metadata.google.internal`、`metadata.*`、`*.arpa`、空 host。
5. IP 字面量：`node:net.isIP` 判断 IPv4/IPv6，命中则直接私有段校验，私有 → reject。
6. DNS 解析（`node:dns/promises.lookup(host, { all: true })`）：解析全部 A+AAAA，任一私有 → reject；`node:dns` 不可用（Vercel Edge）→ try/catch 跳过，仅靠 4–5 兜底。
7. 全部通过 → resolve。

## 私有段清单

- IPv4 reject：`0.0.0.0/8`、`10/8`、`100.64/10`（CGNAT）、`127/8`、`169.254/16`、`172.16/12`、`192.0.2/32`、`192.168/16`、`224/4`（组播）、`240/4`（保留）、`255.255.255.255`。
- IPv6 reject：`::1/128`、`::/128`、`fc00::/7`（ULA）、`fe80::/10`（link-local）、`ff00::/8`（组播）；v4-mapped `::ffff:a.b.c.d` 折算到对应 IPv4 再判。

## 接入点

**通用包装器（杠杆最高，覆盖 search/detail/probe/proxy）**
- `lib/api/http-utils.ts` `fetchWithTimeout`：fetch 前调 `assertSafeOutboundUrl(url)`。
- `lib/utils/fetch-with-retry.ts` `fetchWithRetry`：在已有 `new URL(url)` 解析后、fetch 前调 `assertSafeOutboundUrl(url)`。

**原生 fetch 路由（内联）**
- `app/api/iptv/route.ts`、`app/api/iptv/stream/route.ts`、`app/api/douban/image/route.ts`、`app/api/ping/route.ts`、`app/api/danmaku/route.ts`、`app/api/premium/category/route.ts`、`app/api/premium/types/route.ts`：拿到 url 后、fetch 前调 `assertSafeOutboundUrl`，捕获 `SsrfGuardError` 返回 403 + 通用文案。

## Edge Runtime 约束

- `wrangler.toml` 已启用 `nodejs_compat` → `node:dns/promises`、`node:net` 在 Cloudflare 可用。
- Vercel Edge：`node:dns` 不可用，`try/catch` 降级为 hostname/IP 字面量校验（代理路由在该平台本就被 `runtime-features` 关闭，影响可忽略）。
- 不使用 Node 专属 API（如 `net.BlockList`），IP 私有段用纯函数判定，保 edge 兼容。

## 残留风险（接受，文档标注）

1. **DNS rebinding**：校验时解析到公网、fetch 时重新解析到内网。v1 不防（防需 `redirect:'manual'` 逐跳校验或 Node agent 锁 IP，二者都改变源行为，违反零回归约束）。
2. DNS 不可达平台仅 hostname/IP 字面量防护。
3. 上游 m3u8 内嵌 variant URL（probe-resolution 场景）：由上游控制，url-guard 会在 fetch variant 时校验，拦截上游指向内网的 variant（属正确行为）。

## 错误语义

`SsrfGuardError` → 路由返回 `403` + 通用文案 `"Blocked: target address not allowed"`（不泄露内部 hostname），`console.warn` 记录细节供 A4 审计。
