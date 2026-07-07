# 合并普通与 premium 设置页为单一配置

## Goal

把当前分离的「普通设置页 `/settings`」与「premium 设置页 `/premium/settings`」合并为单一设置页,并废除独立的 premium 偏好存储(`premiumModeSettingsStore` / `kvideo-premium-mode-settings`),让播放器/显示偏好只保留一份(统一到 `settingsStore` / `AppSettings`)。源列表、history、favorites 等其它按 `isPremium` 拆分的存储保持现状。

## Background

- `AppSettings`(31 字段,localStorage `kvideo-settings`)与 `ModeSettings`(21 字段,`kvideo-premium-mode-settings`)字段 100% 重叠,`ModeSettings` 是前者严格子集、无独有字段;21 个重叠字段默认值逐一比对完全一致。
- 源列表(`sources` + `premiumSources`)本就存储在同一个 `settingsStore`;premium 设置页 hook(`usePremiumSettingsPage`)在读写 `premiumSources` / `locale` / `blockedCategories` 时也直接操作主 store,仅播放器/显示偏好走 `premiumModeSettingsStore`。
- `premiumModeSettingsStore` 的消费点仅 4 个:`usePremiumSettingsPage`、`app/player/page.tsx`(`episodeReverseOrder`)、`DesktopVideoPlayer`(`seekStepSeconds`)、`usePlayerSettings`(snapshot 读 + `updateModeSettings` 写)。
- `premium-mode-settings.ts` 导出的 `getModeSettings` / `getModeSettingsStore` 无任何外部调用者(死代码),可连带删除。
- 云同步只同步主 store 的 `sources`/`premiumSources`/`subscriptions`/`blockedCategories`/`sortBy`/`locale`,从不读写 premium 偏好 → 删除该 store 无需云端迁移。
- player 的 `isPremium` 概念必须保留:驱动「按模式选源」「按模式选 history store(`kvideo-premium-history-store`)」「向子组件透传 / URL 重建」。删除 premium 偏好 store 后,只有 `episodeReverseOrder` 的读写分支会简化为直接用 `settingsStore`。
- 权限门禁不对称且无文档解释:`source_management` 仅 `super_admin` 拥有,premium 整页用 `AdminGate`(`admin` + `super_admin`),净效果是 admin 能编辑 premium 源却不能编辑普通源。
- `Navbar.tsx` 与 `PlayerNavbar.tsx` 各有一处设置入口在 premium 模式下指向 `/premium/settings`,需同步改向。

## Requirements

- **R1** 删除 `lib/store/premium-mode-settings.ts` 及其全部导出(`premiumModeSettingsStore` / `ModeSettings` / `getModeSettings` / `getModeSettingsStore`)。
- **R2** 合并 `/settings` 与 `/premium/settings` 为单一设置页;premium 源管理作为其中一个区段保留。
- **R3** 所有原 `premiumModeSettingsStore` 的消费点(4 处)改为读写主 `settingsStore`;其中 player 侧的 `episodeReverseOrder` 分支简化为直接用主 store。
- **R4** 不做数据迁移:已存的 `kvideo-premium-mode-settings` 直接丢弃,用户回到主 store 默认值(默认值与原 premium 默认完全一致,无感知差异)。
- **R5** 删除 `app/premium/settings` 整个目录;同步把 `components/layout/Navbar.tsx` 与 `components/player/PlayerNavbar.tsx` 中指向 `/premium/settings` 的设置入口改为统一指向 `/settings`。
- **R6** 合并后页面采用混合门禁:premium 源区段用 `AdminGate`(admin + super_admin),普通源区段维持 `PermissionGate(source_management)`(super_admin only)。不改变任何角色现有能力。
- **R7** 不改动 history / favorites / search-history / cloud-sync / 源的 `isPremium` 拆分。

## Acceptance Criteria

- [ ] AC1 设置入口只有一个页面 `/settings`;`/premium/settings` 路由被删除,`Navbar` 与 `PlayerNavbar` 的设置入口统一指向 `/settings`,无死链。
- [ ] AC2 全仓库不再 import `premium-mode-settings`;`lib/store/premium-mode-settings.ts` 已删除,构建无残留引用。
- [ ] AC3 premium 模式下进入播放器,偏好(自动跳片、弹幕、代理模式、seekStep、剧集倒序等)读取自主 `settingsStore`,行为与普通模式一致。
- [ ] AC4 角色权限符合 R6:admin 可编辑 premium 源、不可编辑普通源;super_admin 全部可编辑;viewer 仅可见 `view_settings` 范围。
- [ ] AC5 已有用户的 `kvideo-premium-mode-settings` 被丢弃后不出现异常(该 key 后续无代码读取)。

## Out of Scope

- history / favorites / search-history / cloud-sync 的 premium 分支合并。
- premium 作为「播放模式」概念本身的废除(保留 `isPremium` 用于选源 / 选 history)。
- 权限模型(roles / permissions 定义)本身的重构。
