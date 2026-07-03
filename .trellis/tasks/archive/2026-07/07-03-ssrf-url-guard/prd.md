# A1 SSRF 出站地址过滤

## 背景

当前 8 个接入点对用户可控 URL 直 `fetch`、无内网/IP 过滤（详见父任务 PRD）。Docker 自托管（主战场）下，攻击者可借 `/api/proxy?url=http://169.254.169.254/...` 探云 metadata、扫内网、当开放代理。

用户决策③：**不关闭代理、保持源稳定**，通过"加过滤"防护。

## 范围

1. 新增 `lib/server/url-guard.ts`：出站 URL 安全校验（协议白名单 + hostname 黑名单 + IP 私有段 + DNS 解析）。
2. 接入所有用户可控 URL 的出站 fetch 点：2 个通用包装器 + 7 个原生 fetch 路由。
3. 为 url-guard 的纯函数部分加单元测试。

## 验收标准

- [ ] 内网/链路本地/元数据目标被拦截：`127.0.0.1`、`10.x`、`172.16–31.x`、`192.168.x`、`169.254.x`（含 `169.254.169.254`）、`::1`、`fc00::/7`、`fe80::/10`、`0.0.0.0`、`localhost`、`*.local`、`metadata.*`。
- [ ] 公网视频源放行（http/https 公网域名/IP）。
- [ ] 非 http/https 协议被拒（`file:`、`ftp:`、`gopher:` 等）。
- [ ] 视频源搜索/播放/代理/IPTV/详情/probe 行为与改造前一致（零回归，含 redirect 行为不变）。
- [ ] edge runtime（`nodejs_compat`）下可用；Vercel Edge 下 `node:dns` 不可用时降级为 hostname/IP 字面量校验。
- [ ] 单元测试覆盖：私有 IP 判定、协议白名单、hostname 黑名单、IPv6 私有段。

## 不在范围

- 不改 fetch 的 redirect 策略（保持 `follow`，避免源回归）；DNS rebinding 残留风险在 design 标注。
- 不改 TLS 校验（A5 负责）、不改鉴权（A2 负责）。
