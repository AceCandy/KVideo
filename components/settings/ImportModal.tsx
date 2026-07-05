'use client';

import { useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ImportModalTabs } from './import/ImportModalTabs';
import { FileImportTab } from './import/FileImportTab';
import { LinkImportTab } from './import/LinkImportTab';
import { SubscriptionImportTab } from './import/SubscriptionImportTab';
import { JsonImportTab } from './import/JsonImportTab';
import type { ImportResult } from '@/lib/utils/source-import-utils';
import type { SourceSubscription } from '@/lib/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // File Import Handler
  onImportFile: (jsonString: string) => Promise<boolean> | boolean;
  // Link Import Handler 
  onImportLink: (result: ImportResult) => Promise<boolean> | boolean;
  // Subscription Handlers
  subscriptions: SourceSubscription[];
  onAddSubscription: (sub: SourceSubscription) => Promise<boolean> | boolean;
  onRemoveSubscription: (id: string) => void;
  onRefreshSubscription: (sub: SourceSubscription) => Promise<void>;
}

export function ImportModal({
  isOpen,
  onClose,
  onImportFile,
  onImportLink,
  subscriptions,
  onAddSubscription,
  onRemoveSubscription,
  onRefreshSubscription
}: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'link' | 'subscription' | 'json'>('file');

  // Reset to the first tab when the dialog opens. Tracking the previous
  // isOpen in render avoids setState-in-effect (React's "adjusting state
  // when props change" pattern).
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setActiveTab('file');
  }

  const titleId = useId();

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={titleId}>
      <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] p-6 flex flex-col max-h-[85vh]">
        <ModalHeader title="导入设置" onClose={onClose} titleId={titleId} />

          <ImportModalTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1 min-h-0">
            {activeTab === 'file' && (
              <FileImportTab onImport={onImportFile} />
            )}

            {activeTab === 'link' && (
              <LinkImportTab onImport={onImportLink} />
            )}

            {activeTab === 'subscription' && (
              <SubscriptionImportTab
                subscriptions={subscriptions}
                onAdd={onAddSubscription}
                onRemove={onRemoveSubscription}
                onRefresh={onRefreshSubscription}
              />
            )}

            {activeTab === 'json' && (
              <JsonImportTab />
            )}
          </div>
        </div>
    </Modal>
  );
}
