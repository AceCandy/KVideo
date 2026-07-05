# 前端批次4a：skip-link 跳转到主内容

## Goal

在页面顶部提供"跳到主内容"skip-link，让键盘与屏幕阅读器用户能跳过重复的导航（Navbar 等）直达主内容区。

## Background

- 现状：`app/layout.tsx` 的 `PasswordGate` 内直接渲染 `{children}`，无 `<main>` 语义容器，也无 skip-link。键盘用户每次进入页面都要 Tab 穿过 Navbar 等重复元素才能到达主内容。
- `PasswordGate`：`!isLocked` 时 `return <>{children}</>`（正常使用），`isLocked` 时渲染密码 gate（简单表单，不需要 skip-link）。
- `app/page.tsx` 等页面根无统一 `<main>` / id。

## Requirements

### R1 主内容容器语义化
- 在 `app/layout.tsx` 的 `PasswordGate` 内，把 `{children}` 包进 `<main id="main-content" tabIndex={-1}>`。`tabIndex={-1}` 让 skip-link 跳转后可编程聚焦。

### R2 skip-link
- 在 `<main>` 前加 `<a href="#main-content" className="skip-link">跳到主内容</a>`，作为 Tab 序列首个可聚焦元素。
- 仅在 `!isLocked`（children 渲染）时出现，gate 场景不出现。

### R3 skip-link 样式（`app/globals.css`）
- 默认视觉隐藏（移出视口，不占空间），`:focus` / `:focus-visible` 时滑入视口左上角可见。
- z-index 高于 toast（`z-[10001]`）与 modal（`z-[9999]`）。
- 使用项目 token（`--accent-color`、`--radius-2xl` 等）。

### R4 spec 沉淀
- `.trellis/spec/frontend/` 增补：每个页面顶层应有一个指向 `<main>` 的 skip-link 作为 Tab 首个聚焦点；主内容用 `<main>` + `tabIndex={-1}`。

## Out of Scope

- Navbar / IPTV 侧栏内部的 roving tabindex（批次 4 其他子项）。
- 字幕轨道、aria-live 接入（批次 4 其他子项）。

## Acceptance Criteria

- [ ] 首次 Tab 聚焦到"跳到主内容"链接，回车跳转并聚焦到 `<main id="main-content">`。
- [ ] skip-link 默认不可见，聚焦时在视口左上角可见，样式与其他 overlay 层一致。
- [ ] 主内容用 `<main>` 标签包裹，不破坏现有布局。
- [ ] `npx tsc --noEmit` 通过；改动文件 eslint 无新增告警。
- [ ] spec 增补 skip-link 约定。

## Risks

- `<main>` 包裹可能影响依赖 `children` 直接为 DOM 根的布局/CSS：`<main>` 无默认样式，且原 children 多为 block 容器，风险低；`tsc` + 视觉审查兜底。
- skip-link 焦点行为无法在此环境端到端验证（需浏览器），以标准模式（href + tabIndex=-1）+ 代码审查为准。
