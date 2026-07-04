'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSession } from '@/lib/store/auth-store';
import { SettingsSection } from './SettingsSection';
import { SessionCard } from './account/SessionCard';
import { LoginModeBanner } from './account/LoginModeBanner';
import { ManagedAccountsList } from './account/ManagedAccountsList';
import { LegacyAccountsPanel } from './account/LegacyAccountsPanel';
import type { AccountInfo, EditableAccount, LoginMode, Permission, Session } from './account/types';
import { arraysEqual, buildEditableAccounts } from './account/utils';

export function AccountSettings() {
  const [session, setSessionState] = useState<Session>(null);
  const [hasAuth, setHasAuth] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('none');
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [draftAccounts, setDraftAccounts] = useState<EditableAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const canManageAccounts = session?.role === 'super_admin';
  const isManagedMode = loginMode === 'managed';

  const fetchAccounts = useCallback(async () => {
    if (!canManageAccounts) return;

    setLoadingAccounts(true);
    setSaveError('');

    try {
      const response = await fetch('/api/auth/accounts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load accounts');
      }

      const nextAccounts = (data.accounts || []) as AccountInfo[];
      setAccounts(nextAccounts);
      setDraftAccounts(buildEditableAccounts(nextAccounts));
      setIsDirty(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to load accounts');
    } finally {
      setLoadingAccounts(false);
    }
  }, [canManageAccounts]);

  useEffect(() => {
    setSessionState(getSession());

    fetch('/api/auth')
      .then((response) => response.json())
      .then((data) => {
        setHasAuth(!!data.hasAuth);
        setLoginMode(data.loginMode || 'none');
      })
      .catch(() => {
        // Ignore config failures and keep the conservative default.
      });
  }, []);

  useEffect(() => {
    if (!canManageAccounts) return;
    fetchAccounts();
  }, [canManageAccounts, fetchAccounts, loginMode]);

  const currentDraftAccounts = useMemo(
    () => draftAccounts.filter((account) => !account.markedForDeletion),
    [draftAccounts]
  );

  const addDraftAccount = () => {
    setDraftAccounts((current) => [
      ...current,
      {
        username: '',
        name: '',
        role: 'viewer',
        customPermissions: [],
        password: '',
        isNew: true,
      },
    ]);
    setIsDirty(true);
    setSaveSuccess('');
  };

  const updateDraftAccount = (index: number, patch: Partial<EditableAccount>) => {
    setDraftAccounts((current) => current.map((account, accountIndex) => {
      if (accountIndex !== index) return account;
      return {
        ...account,
        ...patch,
      };
    }));
    setIsDirty(true);
    setSaveSuccess('');
  };

  const toggleDraftPermission = (index: number, permission: Permission) => {
    setDraftAccounts((current) => current.map((account, accountIndex) => {
      if (accountIndex !== index) return account;

      const nextPermissions = account.customPermissions.includes(permission)
        ? account.customPermissions.filter((value) => value !== permission)
        : [...account.customPermissions, permission];

      return {
        ...account,
        customPermissions: nextPermissions,
      };
    }));
    setIsDirty(true);
    setSaveSuccess('');
  };

  const removeDraftAccount = (index: number) => {
    setDraftAccounts((current) => current.flatMap((account, accountIndex) => {
      if (accountIndex !== index) return [account];
      if (account.isNew) return [];
      return [{ ...account, markedForDeletion: true }];
    }));
    setIsDirty(true);
    setSaveSuccess('');
  };

  const restoreDrafts = () => {
    setDraftAccounts(buildEditableAccounts(accounts));
    setIsDirty(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const saveManagedAccounts = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const originalById = new Map(accounts.map((account) => [account.id, account]));

    try {
      for (const draft of draftAccounts) {
        if (draft.markedForDeletion && draft.id) {
          const response = await fetch(`/api/auth/accounts/${draft.id}`, {
            method: 'DELETE',
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `Failed to delete ${draft.name}`);
          }
        }
      }

      for (const draft of draftAccounts) {
        if (draft.markedForDeletion) continue;

        if (draft.isNew) {
          const response = await fetch('/api/auth/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: draft.username,
              name: draft.name,
              password: draft.password,
              role: draft.role,
              customPermissions: draft.customPermissions,
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `Failed to create ${draft.name || draft.username}`);
          }
          continue;
        }

        if (!draft.id) continue;
        const original = originalById.get(draft.id);
        if (!original) continue;

        const patch: Record<string, unknown> = {};
        if (draft.name !== original.name) patch.name = draft.name;
        if (draft.role !== original.role) patch.role = draft.role;
        if (!arraysEqual(draft.customPermissions, original.customPermissions)) {
          patch.customPermissions = draft.customPermissions;
        }
        if (draft.password) patch.password = draft.password;

        if (Object.keys(patch).length === 0) continue;

        const response = await fetch(`/api/auth/accounts/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Failed to update ${draft.name}`);
        }
      }

      await fetchAccounts();
      setSaveSuccess('账户修改已保存');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save accounts');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasAuth && !session) return null;

  return (
    <SettingsSection title="账户管理" description="查看当前登录用户，并根据部署模式管理访问账户。">
      <div className="space-y-6">
        {session && <SessionCard session={session} />}

        <LoginModeBanner loginMode={loginMode} isManagedMode={isManagedMode} />

        {isManagedMode ? (
          canManageAccounts ? (
            <ManagedAccountsList
              session={session}
              loadingAccounts={loadingAccounts}
              saveError={saveError}
              saveSuccess={saveSuccess}
              isDirty={isDirty}
              isSaving={isSaving}
              currentDraftAccounts={currentDraftAccounts}
              onAdd={addDraftAccount}
              onUpdate={updateDraftAccount}
              onTogglePermission={toggleDraftPermission}
              onRemove={removeDraftAccount}
              onRestore={restoreDrafts}
              onSave={saveManagedAccounts}
            />
          ) : (
            <div className="p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color-secondary)]">
              当前模式已启用托管账户，但只有超级管理员可以查看和修改账户列表。
            </div>
          )
        ) : (
          canManageAccounts && <LegacyAccountsPanel accounts={accounts} />
        )}
      </div>
    </SettingsSection>
  );
}
