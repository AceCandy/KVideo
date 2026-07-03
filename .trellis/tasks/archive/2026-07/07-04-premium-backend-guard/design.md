# 设计：premium 后端校验

## 凭证模型

premium 解锁后由后端设置 httpOnly 签名 cookie `kvideo_premium`，浏览器会话级（与 PremiumPasswordGate 的 sessionStorage 语义对齐，无 maxAge）。token 为无状态 HMAC：`base64(random32).base64(hmac(secret, random))`，不携带 payload、不落存储，验签即通过。

## 模块改动

| 文件 | 改动 |
|---|---|
| `lib/server/auth-helpers.ts` | 新增 signPremiumToken / verifyPremiumToken（复用内部 importHmacKey / encodeBase64Url） |
| `lib/server/auth/config.ts` | 新增 PREMIUM_COOKIE_NAME |
| `lib/auth/session-edge.ts` | re-export PREMIUM_COOKIE_NAME（保持 edge 侧符号统一） |
| `lib/server/auth/service.ts` | 新增 createPremiumUnlockResponse / hasPremiumAccess |
| `app/api/auth/route.ts` | type=premium 校验通过时改用 createPremiumUnlockResponse（设 cookie） |
| `app/api/premium/category/route.ts` | POST 起手调 hasPremiumAccess，失败 401 |
| `app/api/premium/types/route.ts` | 同上 |

## hasPremiumAccess 判定顺序

1. 持有 admin/super_admin session → 直通
2. 未配置 PREMIUM_PASSWORD → 全放行（无隔离需求）
3. 校验 premium cookie 签名 → 通过放行，否则 401

## 边界

- cookie 与 session 共用同一 secret（resolveSessionSecretFromEnv），无需新密钥。
- token 无过期（浏览器会话级），关闭浏览器即失效；与前端 sessionStorage 一致。
- /api/auth type=premium 响应同时含 `{valid:true}` 与 Set-Cookie，前端读 valid、浏览器存 cookie，互不干扰。

## 风险

- 前端 PremiumPasswordGate 不读 cookie（httpOnly），UX 仍靠 sessionStorage；若用户清 sessionStorage 但 cookie 还在，前端会重弹锁屏而后端仍放行——可接受（多锁一次，无安全损失）。
- premium cookie 不绑定会话指纹，任何拿到 token 的客户端可复用；但 token 仅在本浏览器、httpOnly、且需先通过密码校验获得，风险可接受。
