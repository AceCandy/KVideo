# Implement — 合并普通与 premium 设置页

## 有序 checklist

1. **扩展 `useSettingsPage`**(`app/settings/hooks/useSettingsPage.ts`)
   - 新增状态:`premiumSources` / `isPremiumAddModalOpen` / `premiumEditingSource`。
   - `syncFromStore` 内增加 `setPremiumSources(settings.premiumSources || [])`。
   - 新增 `handlePremiumSourcesChange` / `handleAddPremiumSource` / `handleEditPremiumSource`,逻辑与普通源 handler 对称,写入 `settingsStore` 的 `premiumSources` 字段。
   - return 暴露上述新增项 + `setIsPremiumAddModalOpen` / `setPremiumEditingSource`。
   - 验证:页面可读取并展示 premium 源列表。

2. **扩展 `/settings` 页面**(`app/settings/page.tsx`)
   - import `PremiumSourceSettings` 与 `AdminGate`。
   - 在普通源区段(`PermissionGate(source_management)`)之后插入 `<AdminGate><PremiumSourceSettings ... /></AdminGate>`,绑定 premium handler。
   - 新增第二个 `<AddSourceModal>` 实例,绑定 premium 状态(`isPremiumAddModalOpen` / `premiumEditingSource` / `handleAddPremiumSource` / `existingIds = premiumSources.map(s => s.id)`)。
   - 验证:admin / super_admin 可见可编辑 premium 源;viewer 不可见。

3. **简化 player 三处分支**
   - `app/player/page.tsx`:`episodeReverseOrder` 读写改用 `settingsStore`;移除 `modeStore` 变量与 `premiumModeSettingsStore` import。
   - `components/player/DesktopVideoPlayer.tsx`:`seekStepSeconds` 订阅改用 `settingsStore`;移除 isPremium 分支与 import。
   - `components/player/hooks/usePlayerSettings.ts`:`getPlayerSettingsSnapshot` 与 `updateModeSettings` 统一 `settingsStore`;检查 `isPremium` 参数是否仍被使用,若否则移除并更新调用方。
   - 验证:premium 模式下播放器偏好(seekStep、剧集倒序、弹幕、代理模式)与普通模式一致。

4. **简化两个 Navbar**
   - `components/layout/Navbar.tsx`:`settingsHref` 三元 → 常量 `/settings`。
   - `components/player/PlayerNavbar.tsx`:`href` 三元 → `/settings`。
   - 验证:两种模式下设置入口均进入 `/settings`。

5. **删除 premium 设置页与 hook**
   - 删除 `app/premium/settings/` 整个目录(`page.tsx` + `hooks/usePremiumSettingsPage.ts`)。
   - 验证:`/premium/settings` 路由不再存在;全仓库无对 `usePremiumSettingsPage` 的残留 import。

6. **删除 premium 偏好 store**
   - 删除 `lib/store/premium-mode-settings.ts`。
   - grep 确认零引用(排除 `.next`)。
   - 验证:构建通过。

7. **(可选)一次性清理旧 key**
   - 在 `settingsStore` 初始化处加 `localStorage.removeItem('kvideo-premium-mode-settings')`。
   - 验证:首次加载后该 localStorage key 被清除。

## 验证命令

- Lint:`npm run lint`
- 类型检查 + 构建:`npm run build`
- 测试(若涉及):`npm test`
- 残留引用排查(应均为空):
  - `grep -rn "premium-mode-settings\|premiumModeSettingsStore\|getModeSettings\b" --include="*.ts" --include="*.tsx" app components lib | grep -v ".next"`
  - `grep -rn "/premium/settings" --include="*.ts" --include="*.tsx" app components lib`

## 风险文件 / 回滚点

- `components/player/hooks/usePlayerSettings.ts`:移除 `isPremium` 参数可能波及调用方,需先确认全部调用点再改。
- `app/player/page.tsx`:`episodeReverseOrder` 读写改写后,需保证 premium 模式下倒序行为不丢失。
- 建议单次提交整体收口,便于一键回滚。

## 提交前自检

- 逐条核对 AC1–AC5。
- 三角色(admin / super_admin / viewer)权限行为手测:premium 源区段对 admin 可见、普通源区段对 admin 隐藏。
