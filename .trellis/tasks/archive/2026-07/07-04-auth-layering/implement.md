# 执行计划：auth 模块分层

按依赖自底向上拆分，每完成一档跑 `npx tsc --noEmit` 确认无类型回归。

## 清单

- [ ] 1. 建 `lib/server/auth/config.ts`：迁入 env 读取、`isLegacyAuthConfigured`、`resolveSessionSecret`、`generateLegacyProfileId`，以及从 session-edge.ts 合并来的 `hasAuthConfigured`（纯 env 综合判定）。验证：tsc。
- [ ] 2. 建 `lib/server/auth/runtime.ts`：迁入 `getRedisClient`、`cachedRedis`、`isManagedAuthConfigured`。验证：tsc。
- [ ] 3. 建 `lib/server/auth/account-repository.ts`：迁入账号读/写/引导播种/计数与记录校验。验证：tsc。
- [ ] 4. 建 `lib/server/auth/session.ts`：迁入 session 签发/验证/cookie/响应/类型转换。验证：tsc。
- [ ] 5. 建 `lib/server/auth/service.ts`：迁入登录认证/premium/账号 CRUD/权限判断/`getPublicAuthConfig`。验证：tsc。
- [ ] 6. 改 `lib/server/auth.ts` 为 barrel：re-export 上述对外符号。验证：tsc + `npm run test` 全绿。
- [ ] 7. 改 `lib/auth/session-edge.ts`：复用 `auth/config.ts`，删除内联复刻。验证：`session-edge.test.ts` 全绿。
- [ ] 8. 本地 dev 复测：legacy 模式 401/200/429 行为一致。

## 验证命令

- 类型：`npx tsc --noEmit`
- 单元测试：`npm run test`
- 本地行为：`PORT=3100 ACCESS_PASSWORD=test123 npm run dev` + curl 三连（匿名 401 / 白名单 200 / 连打 429）

## review gate

第 6 步 barrel 落地后、第 7 步前，整体跑一次 `npm run test` + tsc，确认对外 API 真正零回归，再继续 session-edge 统一。

## 回滚点

单一 commit；任何验证失败即 `git revert`，回到 auth.ts 655 行原状。
