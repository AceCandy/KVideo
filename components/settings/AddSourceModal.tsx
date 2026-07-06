'use client';

import { useId } from 'react';
import { useAddSourceForm } from './hooks/useAddSourceForm';
import { Modal } from '@/components/ui/Modal';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { toast } from '@/lib/store/toast-store';
import type { VideoSource } from '@/lib/types';

const inputProps = {
  spellCheck: false,
  autoCorrect: 'off' as const,
  autoCapitalize: 'off' as const,
  autoComplete: 'off' as const,
  'data-form-type': 'other',
  'data-lpignore': 'true',
  lang: 'en',
  translate: 'no' as const,
};

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (source: VideoSource) => void;
  existingIds: string[];
  initialValues?: VideoSource | null;
}

export function AddSourceModal({ isOpen, onClose, onAdd, existingIds, initialValues }: AddSourceModalProps) {
  const handleAdd = (source: VideoSource) => {
    onAdd(source);
    toast.success(initialValues ? '源已更新' : '源已添加');
  };

  const { name, setName, customId, setCustomId, url, setUrl, error, handleSubmit, isEditing } = useAddSourceForm({
    isOpen,
    existingIds,
    onAdd: handleAdd,
    onClose,
    initialValues,
  });

  const titleId = useId();

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={titleId}>
      <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] p-6">
        <ModalHeader title={initialValues ? "编辑视频源" : "添加自定义源"} onClose={onClose} titleId={titleId} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="source-name" className="block mb-2 font-medium text-[var(--text-color)]">
              源名称
            </label>
            <input
              id="source-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：新视频源"
              {...inputProps}
              className="w-full bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-[var(--radius-2xl)] px-4 py-3 text-[var(--text-color)] placeholder:text-[var(--text-color-secondary)] focus:outline-none focus:border-[var(--accent-color)] focus:ring-4 focus:ring-[var(--accent-focus-color)] transition-all duration-[0.4s]"
            />
          </div>

          <div>
            <label htmlFor="source-id" className="block mb-2 font-medium text-[var(--text-color)]">
              源 ID
            </label>
            <input
              id="source-id"
              type="text"
              value={customId}
              onChange={(e) => setCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="自动生成，可手动修改"
              disabled={isEditing}
              {...inputProps}
              className="w-full bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-[var(--radius-2xl)] px-4 py-3 text-[var(--text-color)] placeholder:text-[var(--text-color-secondary)] focus:outline-none focus:border-[var(--accent-color)] focus:ring-4 focus:ring-[var(--accent-focus-color)] transition-all duration-[0.4s] disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-[var(--text-color-secondary)]">
              用于唯一标识此源，仅支持小写字母、数字和连字符
            </p>
          </div>

          <div>
            <label htmlFor="source-url" className="block mb-2 font-medium text-[var(--text-color)]">
              接口地址
            </label>
            <input
              id="source-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/api.php/provide/vod"
              {...inputProps}
              className="w-full bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-[var(--radius-2xl)] px-4 py-3 text-[var(--text-color)] placeholder:text-[var(--text-color-secondary)] focus:outline-none focus:border-[var(--accent-color)] focus:ring-4 focus:ring-[var(--accent-focus-color)] transition-all duration-[0.4s]"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-[var(--radius-2xl)] px-4 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] font-semibold hover:bg-[color-mix(in_srgb,var(--text-color)_10%,transparent)] transition-all duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-[var(--radius-2xl)] bg-[var(--accent-color)] text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 shadow-[var(--shadow-sm)] transition-all duration-200"
            >
              {initialValues ? "保存" : "添加"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
