# premium 内容后端校验

## 背景

research 发现：`/api/premium/category` 与 `/api/premium/types` 路由无任何后端权限校验；`PremiumPasswordGate` 是纯客户端 gate，`/api/auth type=premium` 校验后只返回 `{valid}` 不设任何凭证。结合 A2 middleware 在"仅 PREMIUM_PASSWORD"模式下放行所有 `/api/*`，premium-only 部署的内容隔离后端可绕过（直接 POST premium API 即拿内容）。

## 目标

让 premium 内容隔离在后端强制：未持有有效 premium 凭证的请求不得访问 `/api/premium/*`。

## 约束

- 不破坏现有 admin/managed 登录流程（admin session 直通 premium）。
- 不破坏 none 模式与无 PREMIUM_PASSWORD 部署（无密码 = 无隔离 = 全放行）。
- 复用 auth-helpers 现有 HMAC 机制，不引入新依赖。
- PremiumPasswordGate 前端最小改动（cookie httpOnly 由响应自动设置，前端仍用 sessionStorage 做 UX）。

## 验收

- [ ] 仅设 PREMIUM_PASSWORD 启动：未解锁 POST /api/premium/category 与 /api/premium/types 返回 401。
- [ ] 经 /api/auth type=premium 解锁后，两路由返回 200。
- [ ] admin session 直通两路由。
- [ ] 不设 PREMIUM_PASSWORD（none / 纯访问密码）时两路由不受影响。
- [ ] signPremiumToken / verifyPremiumToken 单测通过。
- [ ] 现有测试全绿、tsc 无新错。

## 不在范围

- 前端 PremiumPasswordGate UX 重构。
- premium 源管理（settings.premiumSources）。
- /api/premium GET 死路由清理（保留稳定性）。
