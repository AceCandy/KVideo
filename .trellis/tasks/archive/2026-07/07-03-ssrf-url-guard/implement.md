# A1 执行计划

## 顺序

1. 新建 `lib/server/url-guard.ts`（`assertSafeOutboundUrl` + `SsrfGuardError` + 纯函数 + 私有段清单 + DNS 解析与降级）。
2. 新建 `tests/url-guard.test.ts`（纯函数单测：协议白名单、hostname 黑名单、IPv4/IPv6 私有段、v4-mapped 折算）。
3. 接入 `lib/api/http-utils.ts` `fetchWithTimeout`。
4. 接入 `lib/utils/fetch-with-retry.ts` `fetchWithRetry`。
5. 内联接入 7 个原生 fetch 路由：iptv、iptv/stream、douban/image、ping、danmaku、premium/category、premium/types。
6. 验证。

## 验证命令

```bash
npx tsc --noEmit
npm test            # 含新 url-guard 测试
npm run lint        # 软卡，确认新增文件无新增 any
```

## 改动文件清单（预期）

- A `lib/server/url-guard.ts`
- A `tests/url-guard.test.ts`
- M `lib/api/http-utils.ts`
- M `lib/utils/fetch-with-retry.ts`
- M `app/api/iptv/route.ts`
- M `app/api/iptv/stream/route.ts`
- M `app/api/douban/image/route.ts`
- M `app/api/ping/route.ts`
- M `app/api/danmaku/route.ts`
- M `app/api/premium/category/route.ts`
- M `app/api/premium/types/route.ts`

## 回滚点

- url-guard 为新增模块；接入点均 try/catch 包裹，回归风险低。
- 若某接入点导致源回归，可单独回退该接入点（保留 url-guard 文件与他处接入）。
