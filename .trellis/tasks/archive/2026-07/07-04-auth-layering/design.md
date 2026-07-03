# 设计：auth 模块分层

## 分层边界

拆为 5 个子模块（放 `lib/server/auth/` 子目录）+ 1 个 barrel：

| 模块 | 职责 | 关键依赖 |
|---|---|---|
| `auth/config.ts` | env 读取、loginMode 配置侧判定、session 密钥派生、`hasAuthConfigured`/`isLegacyAuthConfigured`（纯 env） | 仅 WebCrypto、auth-helpers；**不引入 @upstash/redis** |
| `auth/runtime.ts` | Redis 客户端单例、`getRedisClient`、`isManagedAuthConfigured` | @upstash/redis |
| `auth/account-repository.ts` | 账号数据访问：读/写/引导播种/计数 | runtime.ts、auth-helpers |
| `auth/session.ts` | session 签发/验证、cookie、登录响应、类型转换 | config.ts、auth-helpers |
| `auth/service.ts` | 业务编排：登录认证、premium 校验、账号 CRUD、权限判断、`getPublicAuthConfig`（组合配置 + 账号数） | 上述全部 |
| `auth.ts`（barrel） | re-export 对外 19 个符号 | 全部子模块 |

## 依赖方向

```
config.ts (edge-safe) ←─ session-edge.ts (middleware)
        ↑
   session.ts
        ↑
   service.ts → runtime.ts → account-repository.ts
```

config.ts 是最底层、edge-safe，不依赖 Redis SDK；session-edge.ts 直接复用它，消除 A2 复刻。

## 对外 API 不变性

auth.ts 退化为 barrel，全部 19 个 export（5 类型 + 14 函数）通过具名 re-export 暴露。6 处路由 import 路径与符号不变。迁移过程中对 export 名不做任何重命名。

## 文件与同名目录共存

`lib/server/auth.ts`（文件）与 `lib/server/auth/`（目录）同名共存。TS module resolution 解析 `@/lib/server/auth` 时文件优先于目录，barrel 生效。实施首步用 `tsc` 验证此解析无歧义。

## session-edge.ts 统一

把 session-edge.ts 的 `hasAuthConfiguredFromEnv` / `resolveSessionSecretFromEnv` 迁入 `auth/config.ts`（语义等价），session-edge.ts 改为 re-export config.ts 的对应函数。middleware 行为不变，原有 `session-edge.test.ts` 验证。注意 session-edge 对外函数名保持不变（`hasAuthConfiguredFromEnv` 等），以免改动 middleware。

## 风险

- **Redis 单例归属**：`getRedisClient` 从 auth.ts 搬到 runtime.ts，config.ts 判 managed 模式时不能再调它；改用纯 env 判定（`AUTH_SECRET && UPSTASH_REDIS_REST_URL && TOKEN`）。
- **循环依赖**：service.ts 既用 session.ts 又用 repository.ts；session.ts 用 config.ts。单向依赖，无环。
- **edge 误引入**：config.ts 必须保持零 `@upstash/redis` import，否则 middleware 编译失败。每步 tsc 校验。

## 回滚

纯文件搬运，单 commit；若 tsc/test 任一失败，整体 revert 该 commit 即可回到现状。
