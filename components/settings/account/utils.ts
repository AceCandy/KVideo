import { clearSession } from '@/lib/store/auth-store';
import type { AccountInfo, EditableAccount, Permission } from './types';

export function buildEditableAccounts(accounts: AccountInfo[]): EditableAccount[] {
  return accounts.map((account) => ({
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    customPermissions: account.customPermissions,
    password: '',
  }));
}

export function arraysEqual(left: Permission[], right: Permission[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export async function logoutAndReload() {
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch {
    // Best-effort logout: clear the local mirror even if the request fails.
  }

  clearSession();
  window.location.reload();
}
