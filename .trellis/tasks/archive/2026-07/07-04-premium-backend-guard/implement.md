# 执行计划：premium 后端校验

## 清单

- [ ] 1. auth-helpers 新增 signPremiumToken / verifyPremiumToken + 单测。验证：tsc + test。
- [ ] 2. config 新增 PREMIUM_COOKIE_NAME；session-edge re-export。验证：tsc。
- [ ] 3. service 新增 createPremiumUnlockResponse / hasPremiumAccess。验证：tsc。
- [ ] 4. /api/auth type=premium 分支改用 createPremiumUnlockResponse。验证：tsc。
- [ ] 5. /api/premium/category + types POST 起手加 hasPremiumAccess 校验。验证：tsc + test。
- [ ] 6. 本地 dev 复测：premium-only 未解锁 401 / 解锁后 200 / admin 直通。

## 验证命令

- 类型：npx tsc --noEmit
- 单测：npm test
- 本地：PORT=3100 PREMIUM_PASSWORD=prem npm run dev + curl

## 回滚

单一 commit；失败即 git revert。
