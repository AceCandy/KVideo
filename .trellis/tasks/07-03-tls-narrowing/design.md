# A5 技术设计

## 问题

`lib/api/http-utils.ts:9` 顶层 `process.env.NODE_TLS_REJECT_UNAUTHORIZED='0'` 在 Node runtime（Docker 主战场）**全局关闭出站 TLS 证书校验**，所有视频源请求都不验证证书，存在中间人风险。Edge runtime 下该 env 设置无效（Edge fetch 不读它），故 Edge 早已默认校验。

## 方案：默认校验 + 按域名豁免

1. 移除全局 `NODE_TLS_REJECT_UNAUTHORIZED='0'` → Node 恢复默认严格校验。
2. 新增 `lib/server/tls-policy.ts`：
   - `getInsecureTlsDomains()`：解析 `INSECURE_TLS_DOMAINS`（逗号分隔，小写）。
   - `isInsecureTlsDomain(host)`：精确或子域匹配。
   - `getInsecureDispatcher()`：缓存一个 `undici.Agent({connect:{rejectUnauthorized:false}})`；动态 import，Edge/无 undici 时返回 null。
   - `dispatcherForUrl(url)`：命中豁免域名则返回 insecure dispatcher，否则 undefined。
3. `fetchWithTimeout` 在 SSRF 校验后、fetch 前调用 `dispatcherForUrl(url)`，命中则把 `dispatcher` 注入 fetch options。

## 兼容性与回归

- Edge runtime：dispatcherForUrl 在 edge 无法创建 undici Agent（动态 import 失败 → null），豁免无效。Edge 本就默认校验，行为不变。**文档标注 Edge 不支持豁免**。
- Node（Docker）：默认校验开启；证书有问题的源需部署者加入 `INSECURE_TLS_DOMAINS`。这是**预期行为变更**（父 PRD 验收标准第 8 条），部署者通过配置恢复兼容。
- TS 类型：`dispatcher` 是 undici 特有 option，不在标准 `RequestInit`。用局部类型 `RequestInit & { dispatcher?: unknown }` 注入，避免 `any`。

## 不做

- 不为每个域名建独立 Agent（共享一个 insecure agent，按 URL 选择性注入即可）。
- 不在 Edge 模拟豁免（平台限制，文档标注）。
- 不改 proxy/route.ts（已是注释，且 edge 路由无法豁免）。
