# 修复 url-guard 在 Edge Runtime 的 node:dns 静态扫描报错

## Goal

url-guard.ts 动态 import node:dns/promises 被 Next.js Edge Runtime 静态扫描拦截，影响 8+ edge route。用字符串拼接绕过静态扫描，运行时降级保持不变。

## Background

`lib/server/url-guard.ts` 的 `assertPublicResolvable` 用 `await import('node:dns/promises')` 做 DNS 解析增强。尽管加了 `/* webpackIgnore: true */` 与 `.catch(() => null)` 运行时降级，Next.js 的 Edge Runtime 在**构建期**做源码 AST 静态扫描，只认字面量 `'node:dns/promises'`，扫描命中即报错：

```
A Node.js module is loaded ('node:dns/promises') which is not supported in the Edge Runtime.
```

`url-guard` 被 8+ 个 Edge route 直接引用（iptv / proxy / ping / douban-image / danmaku / iptv-stream / premium-category / premium-types），并经 `http-utils` 间接被 `detail` route 引用。detail 先报错只是 dev 按需编译的时序现象，其余 route 被访问会同样报错。

## Requirements

- `url-guard.ts` 中不再出现字面量 `'node:dns/promises'`，改用字符串拼接形式（如 `'node:' + 'dns/promises'`）。
- 保留 `.catch(() => null)` 降级路径与既有错误处理语义，不改动其他校验逻辑。
- 注释同步更新：移除「保证 edge runtime 构建通过」这类与实际不符的表述，说明拼接是为绕过静态扫描。

## Acceptance Criteria

- [ ] `app/api/detail/route.ts` 及其他 edge route 不再报 `node:dns/promises ... Edge Runtime` 错误。
- [ ] `tests/url-guard.test.ts` 既有用例通过。

## Notes

- 不改动任何 route 的 `runtime` 声明，保留 Edge 特性。
- 不拆分 url-guard，调用方零改动。
