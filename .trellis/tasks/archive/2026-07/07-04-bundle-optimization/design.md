# 设计：bundle 体积优化

## hls.js 动态化

两处消费方（useHlsPlayer、IPTVPlayer）统一改造：
- 顶部 `import Hls from 'hls.js'` → `import type Hls from 'hls.js'`（仅类型，webpack 不打包运行时）
- 使用 Hls 运行时值的位置（useEffect 内）改为 `const { default: Hls } = await import('hls.js')`
- useEffect 改 async IIFE + cancelled flag，组件卸载后不再 setState/建实例

## 影响面

| 文件 | 改动 |
|---|---|
| components/player/hooks/useHlsPlayer.ts | import type + useEffect async 化 |
| components/iptv/IPTVPlayer.tsx | import type + Hls 用法点 async 化 |

webpack 将 hls.js 拆为独立 chunk，仅这两条运行时路径引用 → 首屏与非 player 页不再载入 hls.js。

## 风险

- player 初始化延后一个 dynamic import 往返（本地几十 ms，CDN 命中后可忽略）；首帧略慢但 player 本就有 manifest 解析延迟，可接受。
- useEffect async 化需正确处理 cleanup（cancelled flag + hls.destroy 保留）。
- `Partial<Hls['config']>`、`useRef<Hls>` 等类型仍可用（type-only）。

## 度量

build 后对比：
- 最大 shared chunk 体积（基线 1109KB）
- hls.js 是否拆为独立 chunk
- 首页 player 之外路径的 JS 下降
