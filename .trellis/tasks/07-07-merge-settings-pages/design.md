# Design — 合并普通与 premium 设置页

## 架构与边界

合并后只保留单一设置入口 `/settings`,偏好只保留单一存储 `settingsStore`(`AppSettings`)。premium 不再拥有独立偏好存储;但作为「播放模式」概念的 `isPremium` 在 player 侧保留,仅用于选源 / 选 history / 透传子组件。

改动集中在三层:
- **存储层**:删除 `lib/store/premium-mode-settings.ts`(含死代码 `getModeSettings` / `getModeSettingsStore`)。
- **页面/hook 层**:`app/settings` 成为唯一设置页,其 hook `useSettingsPage` 扩展承担 premium 源管理;删除 `app/premium/settings` 整个目录。
- **player 消费层**:3 处 `isPremium ? premiumModeSettingsStore : settingsStore` 分支改为直接用 `settingsStore`。

## 合并后 `/settings` 页面结构

沿用普通页现有区段,新增 premium 源区段:

```
SettingsHeader / AppVersionSettings / AccountSettings
PermissionGate(player_settings) → PlayerSettings（完整 props：含 videoTogetherEnabled + showDanmakuApi）
DisplaySettings
UserSourceSettings / UserDanmakuSettings
PermissionGate(source_management) → SourceSettings（普通源）
AdminGate → PremiumSourceSettings（premium 源）          ← 新增
SortSettings
PermissionGate(data_management) → DataSettings
Modals: AddSourceModal（普通源）+ AddSourceModal（premium 源）+ ExportModal / ImportModal / ConfirmDialog
```

## 数据流与契约

- `useSettingsPage` 现已全部读写 `settingsStore`(管理 `sources` 及全部偏好)。扩展点:新增 `premiumSources` 状态与 `handlePremiumSourcesChange` / `handleAddPremiumSource` / `handleEditPremiumSource`,写入 `settingsStore` 的 `premiumSources` 字段,与现有 `handleSourcesChange` 对 `sources` 的处理完全对称。
- premium 源的 `AddSourceModal` 使用独立状态(`isPremiumAddModalOpen` / `premiumEditingSource`)与独立实例,避免与普通源 modal 状态冲突。
- player 侧偏好统一读 `settingsStore.getSettings()`:
  - `app/player/page.tsx`:`episodeReverseOrder` 直接读/写 `settingsStore`,移除 `modeStore` 分支与 `premiumModeSettingsStore` import。
  - `components/player/DesktopVideoPlayer.tsx`:`seekStepSeconds` 直接订阅 `settingsStore`,移除 isPremium 分支与 import。
  - `components/player/hooks/usePlayerSettings.ts`:`getPlayerSettingsSnapshot` 与 `updateModeSettings` 统一用 `settingsStore`;若 `isPremium` 参数因此失效则移除并同步更新调用方(避免 unused 参数)。

## 兼容性与迁移

- 无云端迁移:premium 偏好从不上云,只存在本地 `kvideo-premium-mode-settings`。
- 本地 key 按 R4 直接丢弃:删除 store 后再无代码读取该 key。可选在 `settingsStore` 初始化末尾加一行 `localStorage.removeItem('kvideo-premium-mode-settings')` 做一次性清理(单行,非数据迁移逻辑)。
- `components/layout/Navbar.tsx` 与 `components/player/PlayerNavbar.tsx` 的 `settingsHref` / `href` 三元简化为常量 `/settings`。

## 权衡

- **PlayerSettings 统一为完整 props**:合并后 premium 用户也会看到 `videoTogetherEnabled` 与 danmaku API 设置(原 premium 页隐藏)。这是「偏好统一」的合理结果,非权限变化,符合 R6。
- **保留 `isPremium` 概念**:仅用于 player 选源 / 选 history,不延伸到偏好,避免扩大改动面到 history/favorites(R7 out of scope)。
- **死代码清理**:`getModeSettings` / `getModeSettingsStore` 随 store 一并删除。

## 回滚

改动以删除为主、扩展为辅,回滚点清晰,建议单次提交整体收口:
- 恢复 `lib/store/premium-mode-settings.ts` + `app/premium/settings/`
- 还原 player 三处分支 + 两个 Navbar
- 无破坏性数据写入(R4 不迁移),回滚不涉及数据恢复
