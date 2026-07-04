'use client';

import { Icons } from '@/components/ui/Icon';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import type { EditableAccount, Permission, Role, Session } from './types';
import { PERMISSION_LABELS } from './types';

interface ManagedAccountsListProps {
  session: Session;
  loadingAccounts: boolean;
  saveError: string;
  saveSuccess: string;
  isDirty: boolean;
  isSaving: boolean;
  currentDraftAccounts: EditableAccount[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<EditableAccount>) => void;
  onTogglePermission: (index: number, permission: Permission) => void;
  onRemove: (index: number) => void;
  onRestore: () => void;
  onSave: () => void;
}

export function ManagedAccountsList({
  session,
  loadingAccounts,
  saveError,
  saveSuccess,
  isDirty,
  isSaving,
  currentDraftAccounts,
  onAdd,
  onUpdate,
  onTogglePermission,
  onRemove,
  onRestore,
  onSave,
}: ManagedAccountsListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
            <Icons.Users size={16} className="text-[var(--accent-color)]" />
            账户列表
          </h3>
          <p className="text-xs text-[var(--text-color-secondary)] mt-1">
            支持新增、改权限、重置密码和删除账户。只有点击保存才会提交修改。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRestore}
            disabled={!isDirty || isSaving}
            className="px-3 py-1.5 text-xs bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-full)] text-[var(--text-color-secondary)] disabled:opacity-50 cursor-pointer"
          >
            取消修改
          </button>
          <button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="px-3 py-1.5 text-xs bg-[var(--accent-color)] text-white rounded-[var(--radius-full)] disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3 rounded-[var(--radius-2xl)] border border-red-500/20 bg-red-500/10 text-sm text-red-400">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-[var(--radius-2xl)] border border-emerald-500/20 bg-emerald-500/10 text-sm text-emerald-400">
          {saveSuccess}
        </div>
      )}

      {loadingAccounts ? (
        <div className="p-4 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm text-[var(--text-color-secondary)]">
          正在加载账户...
        </div>
      ) : (
        <div className="space-y-4">
          {currentDraftAccounts.map((account, index) => {
            const extraPermissions = ALL_PERMISSIONS.filter((permission) => !ROLE_PERMISSIONS[account.role].includes(permission));
            const isCurrentAccount = session?.accountId === account.id;

            return (
              <div
                key={account.id || `new-${index}`}
                className="p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--text-color)]">
                      {account.isNew ? '新账户' : account.name || account.username || '未命名账户'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                      {account.role === 'super_admin' ? '超级管理员' : account.role === 'admin' ? '管理员' : '观众'}
                    </span>
                    {isCurrentAccount && (
                      <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] border border-[var(--glass-border)] text-[var(--text-color-secondary)]">
                        当前账户
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(index)}
                    disabled={isCurrentAccount}
                    className="p-1 text-[var(--text-color-secondary)] hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                    title={isCurrentAccount ? '不能删除当前登录账户' : '删除账户'}
                  >
                    <Icons.Trash size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--text-color-secondary)]">用户名</span>
                    <input
                      type="text"
                      value={account.username}
                      disabled={!account.isNew}
                      onChange={(event) => onUpdate(index, { username: event.target.value.toLowerCase() })}
                      className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] disabled:opacity-60 focus:outline-none focus:border-[var(--accent-color)]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--text-color-secondary)]">显示名称</span>
                    <input
                      type="text"
                      value={account.name}
                      onChange={(event) => onUpdate(index, { name: event.target.value })}
                      className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--text-color-secondary)]">角色</span>
                    <select
                      value={account.role}
                      disabled={isCurrentAccount}
                      onChange={(event) => onUpdate(index, { role: event.target.value as Role })}
                      className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] disabled:opacity-60 focus:outline-none focus:border-[var(--accent-color)]"
                    >
                      <option value="viewer">观众</option>
                      <option value="admin">管理员</option>
                      <option value="super_admin">超级管理员</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-1 block">
                  <span className="text-xs text-[var(--text-color-secondary)]">
                    {account.isNew ? '登录密码' : '重置密码（留空表示不修改）'}
                  </span>
                  <input
                    type="password"
                    value={account.password}
                    onChange={(event) => onUpdate(index, { password: event.target.value })}
                    className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)]"
                  />
                </label>

                {extraPermissions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-[var(--text-color-secondary)]">额外权限</span>
                    <div className="flex flex-wrap gap-2">
                      {extraPermissions.map((permission) => {
                        const checked = account.customPermissions.includes(permission);
                        return (
                          <label
                            key={permission}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-color-secondary)] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onTogglePermission(index, permission)}
                              className="w-3.5 h-3.5 rounded accent-[var(--accent-color)]"
                            />
                            {PERMISSION_LABELS[permission]}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[var(--glass-bg)] border border-dashed border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-[var(--text-color-secondary)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)]/30 transition-all w-full justify-center cursor-pointer"
          >
            <Icons.Plus size={14} />
            添加账户
          </button>
        </div>
      )}
    </div>
  );
}
