# A5 执行清单

1. `lib/server/tls-policy.ts`（新建）：`getInsecureTlsDomains` / `isInsecureTlsDomain` / `getInsecureDispatcher` / `dispatcherForUrl`。
2. `lib/api/http-utils.ts`：删除顶层 `NODE_TLS_REJECT_UNAUTHORIZED='0'`；fetchWithTimeout 注入 dispatcher。
3. `tests/tls-policy.test.ts`（新建）：域名解析 / 精确+子域匹配 / 非命中。
4. `docs/tls-policy.md`（新建）：说明默认校验、INSECURE_TLS_DOMAINS 用法、Edge 限制。

## 验证

- `npx tsc --noEmit` → exit 0
- `npm test` → 全绿（原 54 + 新增）

## 回滚

- 还原 http-utils.ts 顶层 env 行 + 移除 dispatcher 注入；删除 tls-policy.ts / 测试 / 文档。

## 风险提示（写入文档）

- 行为变更：Docker 部署下，原先依赖全局 TLS 关闭访问的"证书有问题"的源，升级后需显式加入 `INSECURE_TLS_DOMAINS`，否则连接失败。
