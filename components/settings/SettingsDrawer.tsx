'use client';

import { useEffect, useRef } from 'react';
import { AddSourceModal } from '@/components/settings/AddSourceModal';
import { ExportModal } from '@/components/settings/ExportModal';
import { ImportModal } from '@/components/settings/ImportModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SourceSettings } from '@/components/settings/SourceSettings';
import { PremiumSourceSettings } from '@/components/settings/PremiumSourceSettings';
import { SortSettings } from '@/components/settings/SortSettings';
import { DataSettings } from '@/components/settings/DataSettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { PlayerSettings } from '@/components/settings/PlayerSettings';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { AppVersionSettings } from '@/components/settings/AppVersionSettings';
import { UserSourceSettings } from '@/components/settings/UserSourceSettings';
import { UserDanmakuSettings } from '@/components/settings/UserDanmakuSettings';
import { PermissionGate } from '@/components/PermissionGate';
import { AdminGate } from '@/components/AdminGate';
import { hasPermission } from '@/lib/store/auth-store';
import { useSettingsPage } from '@/components/settings/hooks/useSettingsPage';
import { useSettingsOpen, closeSettings } from '@/lib/store/settings-ui-store';
import { trapFocus } from '@/lib/accessibility/focus-management';

/**
 * 设置抽屉：全局挂载的右侧浮层。
 * 打开时覆盖当前页面但不卸载下层（状态保留）；关闭后下层页面继续之前的状态。
 * 层级沿用 WatchHistorySidebar 方案：遮罩 z-drawer-backdrop、面板 z-sticky，
 * 子 Modal（z-backdrop/z-modal）天然在面板之上。
 */
export function SettingsDrawer() {
  const isOpen = useSettingsOpen();
  const panelRef = useRef<HTMLElement>(null);
  const cleanupFocusTrapRef = useRef<(() => void) | null>(null);

  const {
    sources,
    sortBy,
    realtimeLatency,
    searchDisplayMode,
    fullscreenType,
    seekStepSeconds,
    isAddModalOpen,
    isExportModalOpen,
    isImportModalOpen,
    isResetDialogOpen,
    setIsAddModalOpen,
    setIsExportModalOpen,
    setIsImportModalOpen,
    setIsResetDialogOpen,
    handleSourcesChange,
    handleAddSource,
    handleSortChange,
    handleExport,
    handleImportFile,
    handleImportLink,
    subscriptions,
    handleAddSubscription,
    handleRemoveSubscription,
    handleRefreshSubscription,
    handleResetAll,
    editingSource,
    handleEditSource,
    setEditingSource,
    premiumSources,
    isPremiumAddModalOpen,
    setIsPremiumAddModalOpen,
    setPremiumEditingSource,
    handlePremiumSourcesChange,
    handleAddPremiumSource,
    premiumEditingSource,
    handleEditPremiumSource,
    handleRealtimeLatencyChange,
    handleSearchDisplayModeChange,
    handleFullscreenTypeChange,
    proxyMode,
    handleProxyModeChange,
    handleSeekStepSecondsChange,
    rememberScrollPosition,
    videoTogetherEnabled,
    handleRememberScrollPositionChange,
    handleVideoTogetherEnabledChange,
    locale,
    handleLocaleChange,
    danmakuApiUrl,
    handleDanmakuApiUrlChange,
    danmakuOpacity,
    handleDanmakuOpacityChange,
    danmakuFontSize,
    handleDanmakuFontSizeChange,
    danmakuDisplayArea,
    handleDanmakuDisplayAreaChange,
    blockedCategories,
    handleBlockedCategoriesChange,
  } = useSettingsPage();

  // 焦点陷阱：打开时把键盘焦点限制在抽屉内，关闭时回归触发元素
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (panelRef.current) {
      cleanupFocusTrapRef.current = trapFocus(panelRef.current);
    }
    return () => {
      if (cleanupFocusTrapRef.current) {
        cleanupFocusTrapRef.current();
        cleanupFocusTrapRef.current = null;
      }
      previousFocus?.focus();
    };
  }, [isOpen]);

  // Escape 关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSettings();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 打开时锁定背景滚动
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-drawer-backdrop)] bg-black/40"
        onClick={closeSettings}
      />

      {/* Drawer panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        className="fixed top-0 right-0 bottom-0 w-full sm:max-w-xl z-[var(--z-sticky)] bg-[var(--bg-color)] bg-[image:var(--bg-image)] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.2)] animate-[drawer-slide-in_0.25s_ease-out]"
      >
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <SettingsHeader />

          <AppVersionSettings />

          {/* Account Settings */}
          <AccountSettings />

          {/* Player Settings */}
          <PermissionGate permission="player_settings">
            <PlayerSettings
              fullscreenType={fullscreenType}
              onFullscreenTypeChange={handleFullscreenTypeChange}
              proxyMode={proxyMode}
              onProxyModeChange={handleProxyModeChange}
              seekStepSeconds={seekStepSeconds}
              onSeekStepSecondsChange={handleSeekStepSecondsChange}
              videoTogetherEnabled={videoTogetherEnabled}
              onVideoTogetherEnabledChange={handleVideoTogetherEnabledChange}
              danmakuApiUrl={danmakuApiUrl}
              onDanmakuApiUrlChange={handleDanmakuApiUrlChange}
              danmakuOpacity={danmakuOpacity}
              onDanmakuOpacityChange={handleDanmakuOpacityChange}
              danmakuFontSize={danmakuFontSize}
              onDanmakuFontSizeChange={handleDanmakuFontSizeChange}
              danmakuDisplayArea={danmakuDisplayArea}
              onDanmakuDisplayAreaChange={handleDanmakuDisplayAreaChange}
              showDanmakuApi={hasPermission('danmaku_api')}
            />
          </PermissionGate>

          {/* Display Settings */}
          <DisplaySettings
            realtimeLatency={realtimeLatency}
            searchDisplayMode={searchDisplayMode}
            rememberScrollPosition={rememberScrollPosition}
            onRealtimeLatencyChange={handleRealtimeLatencyChange}
            onSearchDisplayModeChange={handleSearchDisplayModeChange}
            onRememberScrollPositionChange={handleRememberScrollPositionChange}
            locale={locale}
            onLocaleChange={handleLocaleChange}
            blockedCategories={blockedCategories}
            onBlockedCategoriesChange={handleBlockedCategoriesChange}
          />

          {/* Per-User Source Settings (visible to all logged-in users) */}
          <UserSourceSettings />

          {/* Per-User Danmaku Settings (visible to all logged-in users) */}
          <UserDanmakuSettings />

          {/* Source Management */}
          <PermissionGate permission="source_management">
            <SourceSettings
              sources={sources}
              onSourcesChange={handleSourcesChange}
              onAddSource={() => {
                setEditingSource(null);
                setIsAddModalOpen(true);
              }}
              onEditSource={handleEditSource}
            />
          </PermissionGate>

          {/* Premium Source Management（仅 admin / super_admin 可见可编辑） */}
          <AdminGate fallback={null}>
            <PremiumSourceSettings
              sources={premiumSources}
              onSourcesChange={handlePremiumSourcesChange}
              onAddSource={() => {
                setPremiumEditingSource(null);
                setIsPremiumAddModalOpen(true);
              }}
              onEditSource={handleEditPremiumSource}
            />
          </AdminGate>

          {/* Sort Options */}
          <SortSettings
            sortBy={sortBy}
            onSortChange={handleSortChange}
          />

          {/* Data Management */}
          <PermissionGate permission="data_management">
            <DataSettings
              onExport={() => setIsExportModalOpen(true)}
              onImport={() => setIsImportModalOpen(true)}
              onReset={() => setIsResetDialogOpen(true)}
            />
          </PermissionGate>
        </div>

        {/* Modals */}
        <AddSourceModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingSource(null);
          }}
          onAdd={handleAddSource}
          existingIds={sources.map(s => s.id)}
          initialValues={editingSource}
        />

        <AddSourceModal
          isOpen={isPremiumAddModalOpen}
          onClose={() => {
            setIsPremiumAddModalOpen(false);
            setPremiumEditingSource(null);
          }}
          onAdd={handleAddPremiumSource}
          existingIds={premiumSources.map(s => s.id)}
          initialValues={premiumEditingSource}
        />

        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
        />

        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportFile={handleImportFile}
          onImportLink={handleImportLink}
          subscriptions={subscriptions}
          onAddSubscription={handleAddSubscription}
          onRemoveSubscription={handleRemoveSubscription}
          onRefreshSubscription={handleRefreshSubscription}
        />

        <ConfirmDialog
          isOpen={isResetDialogOpen}
          title="清除所有数据"
          message="这将删除所有设置、历史记录、Cookie 和缓存。此操作不可撤销。是否继续？"
          confirmText="清除"
          cancelText="取消"
          onConfirm={handleResetAll}
          onCancel={() => setIsResetDialogOpen(false)}
          dangerous
        />
      </aside>
    </>
  );
}
