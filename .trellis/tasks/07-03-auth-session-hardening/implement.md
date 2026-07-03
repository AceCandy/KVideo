# A2 执行清单

## 变更清单

1. `lib/server/auth-helpers.ts`
   - 导出 `SESSION_MAX_AGE_SECONDS = 60*60*24*30`
   - `verifySessionToken` 增 `iat` 过期校验（字段校验后、return 前）
2. `lib/server/auth.ts`
   - 删除本地 `SESSION_MAX_AGE_SECONDS`（`:81`），改为从 `./auth-helpers` import
3. `lib/auth/session-edge.ts`（新建）
   - `SESSION_COOKIE_NAME`、`hasAuthConfiguredFromEnv()`、`resolveSessionSecretFromEnv()`
   - re-export `verifySessionToken`、`SessionPayload`
4. `middleware.ts`（新建，项目根）
   - handler：非 API / `/api/auth*` / OPTIONS / none 模式 / 无密钥 → next；否则验 cookie → 401
   - `config.matcher` 排除静态资源
5. `tests/session-edge.test.ts`（新建）：env 推断覆盖（none / legacy / managed 三类密钥派生）
6. `tests/session-expiry.test.ts`（新建）：过期 iat → null；新 iat → 通过；篡改 iat → null

## 验证命令

- `npx tsc --noEmit` → exit 0
- `npm test` → 全绿（原 30 + 新增）
- 手工推理回归矩阵（见 design.md“兼容性与回归分析”）

## 回滚点

- A2 全部为新增文件 + 两处小改（auth-helpers 加常量/校验、auth.ts import 替换）。
- 回滚 = 删 `middleware.ts` + 还原 `verifySessionToken` + 还原 `SESSION_MAX_AGE_SECONDS` 来源；其余新增文件不影响运行。
