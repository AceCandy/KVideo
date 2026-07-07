'use client';

import { useState } from 'react';
import { Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SourceManager } from '@/components/settings/SourceManager';
import type { VideoSource } from '@/lib/types';

interface SourceSettingsPanelProps {
  title: string;
  description: string;
  sources: VideoSource[];
  defaultIds: string[];
  onSourcesChange: (sources: VideoSource[]) => void;
  onRestoreDefaults?: () => void;
  onAddSource: () => void;
  onEditSource?: (source: VideoSource) => void;
}

export function SourceSettingsPanel({
  title,
  description,
  sources,
  defaultIds,
  onSourcesChange,
  onRestoreDefaults,
  onAddSource,
  onEditSource,
}: SourceSettingsPanelProps) {
  const [showAllSources, setShowAllSources] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSources = normalizedQuery
    ? sources.filter((source) =>
        source.name.toLowerCase().includes(normalizedQuery) ||
        source.baseUrl.toLowerCase().includes(normalizedQuery)
      )
    : sources;

  // 源列表默认只展示前 10 个，搜索时展开全部匹配项，避免长列表打断设置页节奏。
  const displayedSources = showAllSources || normalizedQuery
    ? filteredSources
    : filteredSources.slice(0, 10);

  const handleToggle = (id: string) => {
    onSourcesChange(
      sources.map((source) =>
        source.id === id ? { ...source, enabled: !source.enabled } : source
      )
    );
  };

  const handleDelete = (id: string) => {
    onSourcesChange(sources.filter((source) => source.id !== id));
  };

  const handleClearAll = () => {
    onSourcesChange([]);
    setIsClearDialogOpen(false);
  };

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    const currentIndex = sources.findIndex((source) => source.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sources.length) return;

    const updated = [...sources];
    [updated[currentIndex], updated[newIndex]] = [updated[newIndex], updated[currentIndex]];

    updated.forEach((source, index) => {
      source.priority = index + 1;
    });
    onSourcesChange(updated);
  };

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[var(--text-color)]">{title}</h2>
          <p className="text-sm text-[var(--text-color-secondary)]">
            {description}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsClearDialogOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-2xl)] border border-red-500/40 bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-red-500 shadow-[var(--shadow-sm)] transition-[background-color,border-color,box-shadow] duration-200 ease-out hover:bg-red-500/10 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            清空全部
          </button>
          {onRestoreDefaults && (
            <button
              type="button"
              onClick={onRestoreDefaults}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[var(--text-color)] shadow-[var(--shadow-sm)] transition-[background-color,border-color,box-shadow] duration-200 ease-out hover:border-[color-mix(in_srgb,var(--accent-color)_24%,var(--glass-border))] hover:bg-[var(--glass-hover)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              恢复默认
            </button>
          )}
          <button
            type="button"
            onClick={onAddSource}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-2xl)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-[filter,box-shadow] duration-200 ease-out hover:brightness-110 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-color)] cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            添加源
          </button>
        </div>
      </div>

      <div className="relative my-5">
        <input
          type="text"
          placeholder="搜索源..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 pl-10 text-[var(--text-color)] placeholder:text-[var(--text-color-secondary)] transition-[border-color,box-shadow] duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
        />
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-color-secondary)]"
          aria-hidden="true"
        />
      </div>

      <SourceManager
        sources={displayedSources}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onReorder={handleReorder}
        onEdit={onEditSource}
        defaultIds={defaultIds}
      />
      {!normalizedQuery && sources.length > 10 && (
        <button
          type="button"
          onClick={() => setShowAllSources((current) => !current)}
          className="mt-4 w-full rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm font-medium text-[var(--text-color)] transition-[background-color,border-color,box-shadow] duration-200 ease-out hover:border-[color-mix(in_srgb,var(--accent-color)_24%,var(--glass-border))] hover:bg-[var(--glass-hover)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] cursor-pointer"
        >
          {showAllSources ? '收起' : `显示全部 (${sources.length})`}
        </button>
      )}

      <ConfirmDialog
        isOpen={isClearDialogOpen}
        title="清空全部视频源"
        message="这将删除当前所有视频源。此操作不可撤销。是否继续？"
        confirmText="清空"
        cancelText="取消"
        onConfirm={handleClearAll}
        onCancel={() => setIsClearDialogOpen(false)}
        dangerous
      />
    </div>
  );
}
