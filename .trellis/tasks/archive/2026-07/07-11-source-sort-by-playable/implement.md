# 执行计划：源列表按可播性优先排序

## 步骤

1. **`app/api/probe-resolution/route.ts`：返回 playable**
   - `probeOne` 在 manifest fetch 成功/失败处分别置 playable；无 episodes/targetUrl 处置 false。
   - 事件 payload 加 playable。
   - → verify：手测 SSE 事件含 playable；resolution 行为不变。

2. **`lib/hooks/useResolutionProbe.ts`：暴露 playable map**
   - event 类型加 playable；新增 state + 返回 playable。
   - → verify：type-check；现有 resolutions 行为不变。

3. **`components/player/episode-list/SourcePanel.tsx`：排序 + 透传到 SourceRow**
   - 新增 prop `sourcePlayables`；sortedSources 排序键加"不可播下沉"，当前源豁免。
   - renderSourceRow 传 `unplayable`。
   - → verify：不可播源沉底；当前源不下沉；未知不下沉。

4. **`components/player/episode-list/SourceRow.tsx`：灰标**
   - 新增 prop `unplayable`；显示"不可播"灰标，轻微置灰，onClick 不变。
   - → verify：标记显示且仍可点。

5. **`app/player/page.tsx`：透传 playable**
   - 解构 useResolutionProbe 的 playable，传 SourcePanel。
   - → verify：端到端排序符合预期。

## 验证命令

- `npm run lint`、`tsc --noEmit`
- 手测：构造一个 manifest 失效源，确认它沉底、当前源不下沉、灰标源可手动点开。

## Review gate

- 步骤 3 后：确认"未知不下沉、当前源豁免"两条不变式。
- 步骤 5 后：端到端确认。

## 回滚点

- 每步独立提交；playable 为可选字段，可逐步回滚。
