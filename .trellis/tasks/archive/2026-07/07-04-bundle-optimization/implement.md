# 执行计划：bundle 体积优化

## 清单

- [ ] 1. useHlsPlayer：import type Hls + useEffect 改 async IIFE（cancelled flag + cleanup 保留）。验证：tsc + dev player 播放。
- [ ] 2. IPTVPlayer：import type Hls + Hls 用法点 async 化。验证：tsc + dev iptv 直播。
- [ ] 3. build 对比：hls.js 独立 chunk、shared chunk 下降。验证：next build + 文件大小。
- [ ] 4. dev 各页回归：首页 / player / iptv / settings 正常。

## 验证命令

- 类型：npx tsc --noEmit
- 构建：npm run build
- 行为：npm run dev + 手动验播放

## 回滚

单一 commit；失败 git revert。
