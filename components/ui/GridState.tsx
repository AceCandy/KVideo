import React from 'react';
import { Icons } from '@/components/ui/Icon';

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
