# A5 TLS 校验收窄

## Goal

移除进程级全局 TLS 校验关闭（`NODE_TLS_REJECT_UNAUTHORIZED='0'`），改为默认严格校验 + 按域名显式豁免，消除 Docker 主战场下的中间人风险；同时为证书有问题的视频源保留可控的豁免通道。

## Requirements

1. 移除 `lib/api/http-utils.ts` 顶层 `process.env.NODE_TLS_REJECT_UNAUTHORIZED='0'`。
2. 新增 `lib/server/tls-policy.ts`：
   - 解析 `INSECURE_TLS_DOMAINS` env（逗号分隔、小写、去空）。
   - `isInsecureTlsDomain`：精确 / 子域匹配。
   - `dispatcherForUrl`：命中豁免域名时返回 undici insecure Agent（Node runtime），否则 undefined。
3. `fetchWithTimeout` 在 fetch 前按 URL 注入 dispatcher；未命中豁免的请求走默认严格校验。
4. Edge runtime 不支持自定义 TLS agent → 豁免在 Edge 无效，文档标注。
5. 新增 `docs/tls-policy.md`：说明默认校验、豁免配置、Edge 限制、行为变更提示。

## Acceptance Criteria

- [ ] `http-utils.ts` 不再出现进程级 `NODE_TLS_REJECT_UNAUTHORIZED`。
- [ ] `getInsecureTlsDomains` 正确解析逗号分隔、去空、小写。
- [ ] `isInsecureTlsDomain`：精确 / 子域匹配为 true；不相关与前缀伪匹配为 false。
- [ ] 未配置 `INSECURE_TLS_DOMAINS` 时 `dispatcherForUrl` 返回 undefined（默认严格校验）。
- [ ] `npx tsc --noEmit` 通过；`npm test` 全绿。
- [ ] `docs/tls-policy.md` 记录行为变更与 Edge 限制。

## 约束

- 行为变更（父 PRD 验收标准第 8 条接受）：Docker 部署下证书有问题的源需显式加入 `INSECURE_TLS_DOMAINS`，否则连接失败。
- 不为单域名建独立 Agent；共享一个 insecure agent 选择性注入。
- 不在 Edge 模拟豁免（平台限制）。
