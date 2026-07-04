# Implement: 拆分 DesktopMoreMenu 组件

执行顺序，每步独立可验证。仅搬迁，不改业务逻辑。

## 准备
1. 切分支 `refactor/split-desktop-more-menu` + `task.py start`

## 子组件
2. 新建 `components/player/desktop/more-menu/AdFilterGroup.tsx`（`'use client'`）
   - `props: { isPremium, isRotated }`
   - 内部 `usePlayerSettings(isPremium)` 取 `adFilterMode`, `setAdFilterMode`
   - 内部 state `isAdFilterOpen`
   - 内部 `AD_FILTER_LABELS` 常量
   - 搬迁原 JSX `:396-434`
   - import `AdFilterMode` 类型 + `Icons`
   - 核对：蒙层 `fixed inset-0 z-10` + 点击关闭、列表 `absolute right-0 top-full mt-2 z-20`、stopPropagation、isRotated 类名三元
   验证：tsc 通过
3. 新建 `components/player/desktop/more-menu/DanmakuGroup.tsx`（`'use client'`）
   - `props: { isPremium, isRotated }`
   - 内部 `usePlayerSettings(isPremium)` 取 9 个弹幕字段/setter（含 `danmakuApiUrl` 只读）
   - 搬迁原 JSX `:439-530`
   - 核对：input stopPropagation、isRotated 类名三元、danmakuApiUrl 只读显示
   验证：tsc 通过

## 壳层改写
4. `DesktopMoreMenu.tsx`
   - 删除 G5 JSX（`:396-434`），替换为 `<AdFilterGroup isPremium={isPremium} isRotated={isRotated}/>`
   - 删除 G6 JSX（`:439-530`），替换为 `<DanmakuGroup isPremium={isPremium} isRotated={isRotated}/>`
   - 从 `usePlayerSettings` 解构中移除迁走的字段：`adFilterMode`, `setAdFilterMode`, `danmakuEnabled`, `setDanmakuEnabled`, `danmakuApiUrl`, `danmakuOpacity`, `setDanmakuOpacity`, `danmakuFontSize`, `setDanmakuFontSize`, `danmakuDisplayArea`, `setDanmakuDisplayArea`
   - 删除壳层 `isAdFilterOpen` state 与 `AD_FILTER_LABELS` 常量（迁入 AdFilterGroup）
   - import 两个子组件
   - 保留：`calculateMenuPosition`、3 个 effect、portal、button、MenuContent 容器 + G1–G4/G7–G9 + Divider
   - 保留 pre-existing orphan 不动：`settingsStore` import、`adFilter`/`setAdFilter` 解构（独立 commit 清理）
   验证：tsc 通过；行数约 500

## 验证
5. 全量 `tsc --noEmit`
   验证：无新增报错
6. `next build`
   验证：edge 构建通过
7. `wc -l` 核对行数
   验证：壳层约 500，最大子组件 < 130
8. 人工渲染对照（dev server）
   - 菜单展开/关闭、scroll 自动关闭
   - 广告过滤子菜单（展开/选模式/点蒙层关闭）
   - 弹幕开关 + 透明度/字号/显示区域调整 + API URL 显示
   - 定位：正常模式 / 全屏 / 旋转
   - 复制链接（原链接/代理链接）
   - 其余开关（自动下集/跳过片头片尾/模式指示器/全屏方式/网页全屏尺寸）
   验证：行为与拆分前一致

## 自检
9. diff 自检：仅搬迁，无业务逻辑改动；prd 不变量 1-8 全部保留
10. 提交（用户确认后）

## 回滚
- 单步 `git checkout` 回退对应文件；整体放弃新分支，main 不受影响
