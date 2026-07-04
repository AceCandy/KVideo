import React from 'react';

interface CardGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 卡片网格容器：统一 2/3/4/5 列响应式布局与间距。
 * 仅负责布局；数据获取、无限滚动 observer 由消费方自理（外部 ref 或内部 hook）。
 */
export function CardGrid({ children, className = '' }: CardGridProps) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 ${className}`}
    >
      {children}
    </div>
  );
}
