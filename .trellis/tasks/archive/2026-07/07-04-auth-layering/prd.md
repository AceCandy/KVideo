# auth 模块分层重构（service/repository）

## 背景

`lib/server/auth.ts` 当前 655 行，单一文件承担环境配置读取、Redis 客户端、账号存储、session 签发验证、cookie、登录认证、premium 校验、账号 CRUD 等全部鉴权职责。战役 A 落地 A2 时，因 middleware 在 edge runtime 不能引入会拉入 `@upstash/redis` 的 auth.ts，被迫在 `lib/auth/session-edge.ts` 复刻了 `hasAuthConfigured` 与 `resolveSessionSecret` 两段逻辑。两段重复长期并存极易在后续演进中漂移。

## 目标

把 auth.ts 拆分为 service/repository 分层，每个模块职责单一、依赖方向清晰；同时让 session-edge.ts 复用拆分后纯 env 的判定逻辑，消除 A2 的逻辑复刻。

## 约束

- 对外 API 零变更：所有 `import ... from '@/lib/server/auth'` 的路由（6 处调用方）不改动一行。
- 行为零回归：现有单元测试全绿；A2/A3/A4/A5 的本地 dev 行为复测一致。
- Surgical：只搬位置与拆分，不顺手优化业务逻辑（premium 合并、参数校验等留给后续）。
- Edge 边界保持：middleware 依赖的 session-edge.ts 仍不得引入 `@upstash/redis`。

## 验收标准

- [ ] `npm run test` 全绿（含原有各项）。
- [ ] `npx tsc --noEmit` 无新增错误。
- [ ] 6 处路由调用方的 import 语句零改动。
- [ ] `lib/auth/session-edge.ts` 不再内联 `hasAuthConfigured` / `resolveSessionSecret`，改为复用拆分后的纯 env 模块；其单元测试全绿。
- [ ] 本地 legacy 模式复测：匿名 `/api/search-parallel` 仍 401、`/api/auth` 仍 200、登录连打 11 次仍 429。
- [ ] `lib/server/auth.ts` 退化为 barrel（re-export），不再含业务实现。

## 不在本次范围

- premium 双轨合并。
- 任何路由文件改动。
- 账号字段、密码策略、session 过期时长等业务参数调整。
