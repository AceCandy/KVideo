# 执行计划：HLS 播放失败自动换源

## 前置确认（review gate 拍板）

- parent 决策项 1：手动选源后 fatal 是否自动换（默认：是）。

## 步骤

1. **`app/player/page.tsx`：tried 集合 + 重构换源内核**
   - 新增 `triedSourcesRef`、初始 source 入集合、title/episode 变化时 reset。
   - `handleSourceUnavailable` 改为读 tried 选未试过的源、全试完置 finalError、带 `t`。
   - → verify：模拟当前 source 不可播，确认选到下一个源；全试完进 finalError 不再跳。

2. **`components/player/VideoPlayer.tsx`：换源回调**
   - 新增 prop `onPlaybackSourceUnavailable?`。
   - `handleVideoError`：代理重试用尽后调该回调，不再 setVideoError。
   - → verify：type-check 通过；代理重试路径不被破坏。

3. **`app/player/page.tsx`：接线 + 提示文案**
   - `<VideoPlayer onPlaybackSourceUnavailable={handleSourceUnavailable} />`。
   - loading 文案在 `isAutoSwitching` 时显示"正在尝试其他源…"。
   - → verify：端到端，选失效源自动跳转并续播。

## 验证命令

- `npm run lint`
- `tsc --noEmit`
- 端到端手测（见各步 verify）

## Review gate

- 步骤 1 后自检：tried 集合维度正确、不漏 reset。
- 步骤 3 后自检：手动选源行为符合决策项 1。

## 回滚点

- 每步独立提交；任一步出问题 `git revert` 对应提交。
