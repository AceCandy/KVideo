'use client';

import { useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalHeader } from '@/components/ui/ModalHeader';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (includeSearchHistory: boolean, includeWatchHistory: boolean) => void;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [includeSearchHistory, setIncludeSearchHistory] = useState(true);
  const [includeWatchHistory, setIncludeWatchHistory] = useState(true);
  const titleId = useId();

  // Reset checkboxes when the dialog opens (prev-tracking in render avoids
  // setState-in-effect).
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIncludeSearchHistory(true);
      setIncludeWatchHistory(true);
    }
  }

  const handleExport = () => {
    onExport(includeSearchHistory, includeWatchHistory);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={titleId}>
      <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] p-6">
        <ModalHeader title="导出设置" onClose={onClose} titleId={titleId} />

        <div className="space-y-4 mb-6">
          <p className="text-[var(--text-color-secondary)] text-sm">
            选择要导出的内容：
          </p>

          {/* Checkbox for Search History */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSearchHistory}
              onChange={(e) => setIncludeSearchHistory(e.target.checked)}
              className="hidden"
            />
            <div className={`w-6 h-6 rounded-[0.6rem] border-2 flex items-center justify-center transition-all duration-200 ${includeSearchHistory
                ? 'bg-[var(--accent-color)] border-[var(--accent-color)]'
                : 'border-[var(--text-color-secondary)]'
              }`}>
              {includeSearchHistory && (
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span className="text-[var(--text-color)]">搜索历史</span>
          </label>

          {/* Checkbox for Watch History */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeWatchHistory}
              onChange={(e) => setIncludeWatchHistory(e.target.checked)}
              className="hidden"
            />
            <div className={`w-6 h-6 rounded-[0.6rem] border-2 flex items-center justify-center transition-all duration-200 ${includeWatchHistory
                ? 'bg-[var(--accent-color)] border-[var(--accent-color)]'
                : 'border-[var(--text-color-secondary)]'
              }`}>
              {includeWatchHistory && (
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span className="text-[var(--text-color)]">观看历史</span>
          </label>

          <div className="text-xs text-[var(--text-color-secondary)] bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] rounded-[var(--radius-2xl)] p-3 mt-4">
            注意：源设置将始终包含在导出中
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] font-semibold hover:bg-[color-mix(in_srgb,var(--text-color)_10%,transparent)] transition-all duration-200"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-6 py-3 rounded-[var(--radius-2xl)] bg-[var(--accent-color)] text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 shadow-[var(--shadow-sm)] transition-all duration-200"
          >
            导出
          </button>
        </div>
      </div>
    </Modal>
  );
}
