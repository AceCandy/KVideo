# bundle 体积优化（动态导入大依赖）

## 背景

项目零 `next/dynamic` / `React.lazy`，所有依赖静态打进首屏。基线 `.next/static` 3.3M，最大 chunk 1109KB（含 hls.js 等）。hls.js（~300KB+）仅 player/iptv 使用，却进了共享首屏 chunk。

前置：战役 A 的 edge 构建回归（undici / node:dns）已 hotfix（`7caf084`），`next build` 恢复通过。

## 目标

把 player 专用大依赖 hls.js 动态化，使其从首屏 shared chunk 拆出，仅在 player/iptv 页运行时载入；首屏 JS 下降。

## 约束

- 行为不变：player/iptv 播放、广告过滤、错误恢复一致；仅初始化延后到 hls.js 模块加载后。
- 不引入新依赖。
- edge 构建仍通过。
- 类型安全：Hls 作为类型仍静态可用（`import type`），运行时用 dynamic import 取值。

## 验收

- [ ] hls.js 拆为独立 chunk（不再进首屏 shared chunk）。
- [ ] 最大 shared chunk 体积下降（基线 1109KB）。
- [ ] 本地 dev：player / iptv 页播放与直播正常，hls 加载期间无崩溃。
- [ ] tsc + test 全绿；next build 通过。

## 不在范围

- 组件统一（C1）、播放器收敛（C2）、store 整理（C3）、大文件拆分（C5）。
- next/dynamic 大组件 lazy（若 hls 动态后降幅达标，留作后续）。

## 研究结论（前提证伪，取消实施）

build 验证发现：webpack 默认 splitting 已将 hls.js 隔离到 player/iptv 专用 chunk（`f788f2b5`，1109KB），首页 `index.html` 引用的 17 个 chunk 不含它。原假设"hls.js 进首屏 shared chunk"不成立：

- 首页：本就不载 hls.js，动态化零收益。
- player/iptv 页：必须载 hls 才能播放，动态化只延后首帧、不降总量。

附带产出：研究期间暴露并修复了战役 A 的 edge 构建回归（undici / node:dns 未排除出 edge bundle），已 hotfix `7caf084` 并 push main，生产 build 恢复通过。

C4 取消。下一步转向 C1（展示组件统一，Grid/Card 5+9 套冗余，收益实在）。
