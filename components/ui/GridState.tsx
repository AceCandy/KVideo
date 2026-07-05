import React from 'react';
import { Icons } from '@/components/ui/Icon';
import { CardGrid } from '@/components/ui/CardGrid';

interface GridEmptyProps {
  icon?: React.ReactNode;
  text?: string;
}

/** 列表空态：默认 Icons.Film + "暂无内容"，可经 props 覆盖 */
export function GridEmpty({ icon, text = '暂无内容' }: GridEmptyProps) {
  return (
    <div className="text-center py-20">
      {icon ?? <Icons.Film size={64} className="text-[var(--text-color-secondary)] mx-auto mb-4" />}
      <p className="text-[var(--text-color-secondary)]">{text}</p>
    </div>
  );
}

/** 加载中：旋转指示器 + 文案 */
export function GridLoading() {
  return (
    <div className="flex justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-color)] border-t-transparent" />
        <p className="text-sm text-[var(--text-color-secondary)]">加载中...</p>
      </div>
    </div>
  );
}

/** 无更多内容 */
export function GridNoMore() {
  return (
    <div className="text-center py-12">
      <p className="text-[var(--text-color-secondary)]">没有更多内容了</p>
    </div>
  );
}

/** 首屏骨架：占位海报 + 标题条，避免首屏仅显示 spinner */
export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <CardGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-2xl)] overflow-hidden">
          <div className="aspect-[2/3] rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] animate-pulse" />
          <div className="pt-3 flex flex-col items-center gap-1.5">
            <div className="h-3 w-3/4 rounded-full bg-[var(--glass-bg)] animate-pulse" />
            <div className="h-3 w-1/2 rounded-full bg-[var(--glass-bg)] animate-pulse" />
          </div>
        </div>
      ))}
    </CardGrid>
  );
}
