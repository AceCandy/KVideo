'use client';

import { useMemo, useState } from 'react';
import { Icons } from '@/components/ui/Icon';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import type { AccountInfo, LegacyConfigEntry, Permission, Role } from './types';
import { PERMISSION_LABELS } from './types';

interface LegacyAccountsPanelProps {
  accounts: AccountInfo[];
}

export function LegacyAccountsPanel({ accounts }: LegacyAccountsPanelProps) {
  const [showLegacyConfig, setShowLegacyConfig] = useState(false);
  const [legacyEntries, setLegacyEntries] = useState<LegacyConfigEntry[]>([]);

  const addLegacyEntry = () => {
    setLegacyEntries((current) => [
      ...current,
      { password: '', name: '', role: 'viewer', customPermissions: [] },
    ]);
  };

  const updateLegacyEntry = (index: number, patch: Partial<LegacyConfigEntry>) => {
    setLegacyEntries((current) => current.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      return {
        ...entry,
        ...patch,
      };
    }));
  };

  const toggleLegacyPermission = (index: number, permission: Permission) => {
    setLegacyEntries((current) => current.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      const nextPermissions = entry.customPermissions.includes(permission)
        ? entry.customPermissions.filter((value) => value !== permission)
        : [...entry.customPermissions, permission];
      return {
        ...entry,
        customPermissions: nextPermissions,
      };
    }));
  };

  const removeLegacyEntry = (index: number) => {
    setLegacyEntries((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const generatedLegacyAccounts = useMemo(() => {
    return legacyEntries
      .filter((entry) => entry.password.trim() && entry.name.trim())
      .map((entry) => {
        let value = `${entry.password.trim()}:${entry.name.trim()}`;
        if (entry.role !== 'viewer' || entry.customPermissions.length > 0) {
          value += `:${entry.role}`;
        }
        if (entry.customPermissions.length > 0) {
          value += `:${entry.customPermissions.join('|')}`;
        }
        return value;
      })
      .join(',');
  }, [legacyEntries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
            <Icons.Settings size={16} className="text-[var(--accent-color)]" />
            环境变量账户配置
          </h3>
          <p className="text-xs text-[var(--text-color-secondary)] mt-1">
            兼容旧部署模式。新增或修改后，把生成的 <code className="px-1 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">ACCOUNTS</code> 值同步到部署环境。
          </p>
        </div>
        <button
          onClick={() => setShowLegacyConfig((current) => !current)}
          className="text-xs text-[var(--accent-color)] hover:underline cursor-pointer"
        >
          {showLegacyConfig ? '收起' : '展开'}
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between px-4 py-2.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] font-bold text-sm border border-[var(--glass-border)]">
                  {account.name.charAt(0)}
                </div>
                <div>
                  <span className="text-sm text-[var(--text-color)]">{account.name}</span>
                  <p className="text-xs text-[var(--text-color-secondary)]">@{account.username}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color-secondary)]">
                {account.role === 'super_admin' ? '超级管理员' : account.role === 'admin' ? '管理员' : '观众'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showLegacyConfig && (
        <div className="space-y-4 p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
          {legacyEntries.map((entry, index) => {
            const extraPermissions = ALL_PERMISSIONS.filter((permission) => !ROLE_PERMISSIONS[entry.role].includes(permission));

            return (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="密码"
                      value={entry.password}
                      onChange={(event) => updateLegacyEntry(index, { password: event.target.value })}
                      className="px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)]"
                    />
                    <input
                      type="text"
                      placeholder="名称"
                      value={entry.name}
                      onChange={(event) => updateLegacyEntry(index, { name: event.target.value })}
                      className="px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)]"
                    />
                    <select
                      value={entry.role}
                      onChange={(event) => updateLegacyEntry(index, { role: event.target.value as Role })}
                      className="px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)]"
                    >
                      <option value="viewer">观众</option>
                      <option value="admin">管理员</option>
                      <option value="super_admin">超级管理员</option>
                    </select>
                  </div>
                  {extraPermissions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {extraPermissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-color-secondary)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={entry.customPermissions.includes(permission)}
                            onChange={() => toggleLegacyPermission(index, permission)}
                            className="w-3.5 h-3.5 rounded accent-[var(--accent-color)]"
                          />
                          {PERMISSION_LABELS[permission]}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeLegacyEntry(index)}
                  className="p-1.5 text-[var(--text-color-secondary)] hover:text-red-500 transition-colors cursor-pointer mt-1"
                >
                  <Icons.Trash size={14} />
                </button>
              </div>
            );
          })}

          <button
            onClick={addLegacyEntry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--glass-bg)] border border-[var(--glass-border)] border-dashed rounded-[var(--radius-2xl)] text-[var(--text-color-secondary)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)]/30 transition-all w-full justify-center cursor-pointer"
          >
            <Icons.Plus size={12} />
            添加账户
          </button>

          {generatedLegacyAccounts && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-color)]">
                生成的 ACCOUNTS 值
              </label>
              <div className="flex gap-2 flex-wrap">
                <code className="flex-1 px-3 py-2 bg-black/20 border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-xs text-[var(--text-color)] break-all select-all">
                  {generatedLegacyAccounts}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedLegacyAccounts)}
                  className="px-3 py-2 bg-[var(--accent-color)] text-white rounded-[var(--radius-2xl)] text-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  <Icons.Copy size={12} />
                  复制
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
