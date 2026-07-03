# 出站 TLS 校验策略

## 默认行为

自安全止血战役起，出站请求默认**严格校验 TLS 证书**。

历史上 `lib/api/http-utils.ts` 顶层通过 `NODE_TLS_REJECT_UNAUTHORIZED='0'` 全局关闭证书校验，这在 Node runtime（Docker 自托管）下会让所有视频源请求暴露于中间人风险。该设置已被移除。

## 按域名豁免

少数视频源使用自签或过期证书。为保持这些源的可用性，提供按域名豁免：

```bash
INSECURE_TLS_DOMAINS=source-a.example.com,source-b.example.com
```

- 逗号分隔；匹配精确域名或其任意子域。
- 命中域名的请求在 Node runtime 下通过专用 undici Agent 关闭证书校验；其余域名仍严格校验。

## 行为变更提示（升级注意）

升级后，原先依赖"全局关闭 TLS"才能访问的证书异常源会连接失败。需把其域名加入 `INSECURE_TLS_DOMAINS` 才能恢复，例如：

```bash
INSECURE_TLS_DOMAINS=legacy-cms.example.com,self-sign.source.tv
```

## Edge runtime 限制

Vercel / Cloudflare Pages 等 Edge runtime 的 `fetch` 不支持自定义 TLS agent，`INSECURE_TLS_DOMAINS` 在 Edge 部署上**不生效**。Edge 上的出站请求始终由平台按默认策略校验证书。需要 TLS 豁免的源请在 Docker / Node.js 自托管下访问。

## 相关

- 实现：`lib/server/tls-policy.ts`
- 注入点：`lib/api/http-utils.ts` 的 `fetchWithTimeout`
