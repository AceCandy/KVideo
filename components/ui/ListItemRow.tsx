import React from 'react';

interface ListItemRowProps {
  href: string;
  title: string;
  poster: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * 收藏 / 历史等横向 list-item 的共享布局。
 * 统一外层卡片样式、链接、中键 / Ctrl+点击新标签行为、poster / title / meta / actions 四区。
 * 各业务 Item 仅传入自己的 poster、meta、actions 内容。
 */
export function ListItemRow({ href, title, poster, meta, actions }: ListItemRowProps) {
  const handleAuxOrModifier = (event: React.MouseEvent) => {
    // 中键或 Ctrl/Cmd+点击：在新标签打开
    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      event.preventDefault();
      window.open(href, '_blank');
    }
  };

  return (
    <div className="group bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] rounded-[var(--radius-2xl)] p-3 hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all border border-transparent hover:border-[var(--glass-border)]">
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          handleAuxOrModifier(e);
          if (!e.ctrlKey && !e.metaKey) {
            window.location.href = href;
          }
        }}
        onAuxClick={handleAuxOrModifier}
        className="block"
      >
        <div className="flex gap-3">
          {poster}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-[var(--text-color)] truncate group-hover:text-[var(--accent-color)] transition-colors mb-1">
              {title}
            </h3>
            {meta}
          </div>
          {actions && (
            <div className="flex flex-col gap-1 self-start opacity-0 group-hover:opacity-100 transition-opacity">
              {actions}
            </div>
          )}
        </div>
      </a>
    </div>
  );
}
