# 战役 A：安全止血与上游基线锁定

## 背景

KVideo 是基于 `KuekHaoYang/KVideo` 的二开项目，主部署形态为 **Docker 自托管（公网暴露）**，兼支持 Vercel / Cloudflare Pages（Edge Runtime）。

当前安全面存在系统性缺陷（详见前序四视角审视报表）：

- 17/21 个 API 路由无鉴权，且**无 `middleware.ts` 统一拦截**，鉴权全靠各路由自觉
- 多个代理/源路由对**用户可控 URL 直 `fetch` 且无内网/IP 过滤**（SSRF + 开放代理）
- `lib/api/http-utils.ts` 顶层**全局关闭 TLS 校验**（Node/Docker 路径生效）
- `verifySessionToken` **不校验过期**，cookie 30 天后服务端永久认
- **无 rate limit**（登录可暴力、代理可被滥用）
- `next.config.ts` 在生产环境**剥离全部 console 日志**，无 Sentry/审计

本战役目标：在**不破坏视频源可用性**的前提下，让自托管实例达到"可安全公网部署"的基线。

## 关键约束（用户已确认）

1. **premium 模式 = 内容隔离（非付费）**——双轨合并不在本战役。
2. **上游同步策略改为"锁定基线 + 选择性 cherry-pick"**——本战役先落地此策略变更（子任务 A0），为后续改造扫清环境（避免改造期间上游每 6h 冲入）。
3. **不去除伪造 IP 头、不关闭开放代理**——保持源稳定性。安全防护通过"加过滤 + 鉴权 + 限流"实现，而非"关功能"。
4. **以 Docker 自托管（Node runtime，公网）为主战场**；Edge Runtime 下不生效的项需在文档标注。

## 范围（in-scope）

| 子任务 | 交付物 |
|---|---|
| A0 upstream-strategy-lock | 停自动全量合并 + 记录基线 commit + cherry-pick 流程文档 + CI 质量门禁（lint/tsc/test） |
| A1 ssrf-url-guard | 新增 `lib/server/url-guard.ts`，接入所有对用户可控 URL 发起 `fetch` 的路由 |
| A2 auth-session-hardening | 新增 `middleware.ts` 统一鉴权 + `verifySessionToken` 过期校验 |
| A3 rate-limit | 接入 `@upstash/ratelimit`，对登录/代理/搜索限流 |
| A4 observability | 生产日志分级保留 + Sentry/GlitchTip 错误上报 + 关键操作审计日志 |
| A5 tls-narrowing | `http-utils` 全局 `NODE_TLS_REJECT_UNAUTHORIZED` 改为按域名豁免 |

## 不在本战役（out-of-scope）

- premium 双轨合并（战役 B）
- 后端分层重构（拆 `auth.ts` / service-repository，战役 B）
- 设计系统硬化（战役 C）
- 任何改变视频源解析/抓取/代理业务行为的改动

## 跨子任务验收标准

部署一个公网自托管实例（设置 `ACCESS_PASSWORD` 与 `AUTH_SECRET`），完成全部子任务后须满足：

1. **源行为零回归**：公网视频源的搜索、播放、IPTV、代理、弹幕、详情行为与改造前一致。
2. **SSRF 被拦截**：`/api/proxy?url=http://169.254.169.254/...`、`?url=http://127.0.0.1:...`、`?url=http://10.x.x.x/...` 等内网/元数据目标被拦截，不返回上游响应；公网视频源放行。
3. **鉴权统一**：`/api/auth/accounts/*` 仍需 super_admin；`ACCESS_PASSWORD` 模式下，除 `/api/auth` 登录端点外的所有路由要求有效 session；`none` 模式下保持匿名可用。
4. **session 过期**：超过 maxAge 的 session token 被服务端拒绝。
5. **限流生效**：`/api/auth` 登录失败有严格速率限制；`/api/proxy`、`/api/search-parallel` 有出站放大限流。
6. **可观测**：生产构建保留 error/warn 日志；后端未捕获错误有 Sentry（或自托管 GlitchTip）上报；账号增删、登录失败、SSRF 拦截有结构化审计日志。
7. **基线锁定**：上游自动全量合并已停；当前基线 commit 记录在文档；CI 跑通 lint + tsc + test。
8. **TLS 收窄**：Docker 路径下进程级 TLS 校验恢复开启；仅对显式配置的源域名豁免（Edge 路径不生效，文档标注）。

## 子任务依赖

- **A0 必须最先做**（停自动合并，解锁稳定改造环境）。
- A1–A5 互相独立，顺序不限；可并行。
- 全部完成后，由本父任务做集成验收（跨子任务回归 + 安全清单复核）。

## 主要风险与权衡

- **A1（SSRF）**：需防 DNS rebinding（先解析再请求可能被重新解析到内网）。Edge Runtime 下 DNS 解析能力受限，可能退化为 hostname 字符串过滤——可行性需在 A1 design 阶段确认。
- **A2（鉴权）**：`none` / `ACCESS_PASSWORD` 模式下"是否强制全部路由登录"属部署者策略，默认行为不得破坏现有匿名部署。
- **A5（TLS）**：Edge Runtime 的 `fetch` 不支持自定义 TLS agent，按域名豁免在 Vercel/CF 上无效；仅 Docker（主战场）生效。需文档标注，避免误以为已全平台修复。
- **A4（可观测）**：Sentry 需配置 DSN；自托管默认应能降级为仅结构化日志（不强制依赖外部服务）。
