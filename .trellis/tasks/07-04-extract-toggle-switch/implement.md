# ToggleSwitch 执行计划

## 顺序

1. 新建 `components/player/desktop/more-menu/ToggleSwitch.tsx`（受控局部组件，含 disabled / isRotated 分支）
   → 验证：`npx tsc --noEmit`
2. 替换 `DesktopMoreMenu.tsx` 4 处内联 button + thumb
   → 验证：`npx tsc --noEmit`
3. 替换 `DanmakuGroup.tsx` 1 处内联 button + thumb（含 disabled 态）
   → 验证：`npx tsc --noEmit`
4. 全量 `npx tsc --noEmit` + `npx next build`
   → 验证：build 通过
5. 逐字符核对 5 处 className 等价（design 推导链 vs 实际产出）

## 验证命令

```bash
npx tsc --noEmit
npx next build
```

## 回滚点

每步独立可回滚；若 build 失败，`git checkout` 对应文件即可。

## 完成判据

- 5 处替换完成，无残留内联 toggle
- tsc + build clean
- className 等价核对通过
- ⚠️ 渲染层未手动验证（标记）
