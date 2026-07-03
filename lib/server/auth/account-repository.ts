/**
 * 账号存储层（repository）。
 * 只负责 managed 账号在 Redis 中的读写、引导播种与计数，不含业务编排。
 */
import {
  createStoredAccount,
  ensureUniqueUsername,
  normalizeUsername,
  parseBootstrapAccounts,
  type SeedAccountInput,
  type StoredAccountRecord,
} from '@/lib/server/auth-helpers';
import { normalizePermissions, normalizeRole } from '@/lib/auth/permissions';
import { ACCOUNTS, effectiveAdminPassword } from '@/lib/server/auth/config';
import { getRedisClient, isManagedAuthConfigured } from '@/lib/server/auth/runtime';

const MANAGED_ACCOUNTS_KEY = 'auth:accounts:v1';

function isStoredAccountRecord(value: unknown): value is StoredAccountRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<StoredAccountRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.username === 'string' &&
    typeof record.name === 'string' &&
    typeof record.passwordHash === 'string' &&
    typeof record.passwordSalt === 'string' &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number'
  );
}

function normalizeStoredAccount(value: StoredAccountRecord): StoredAccountRecord {
  return {
    ...value,
    username: normalizeUsername(value.username),
    role: normalizeRole(value.role),
    customPermissions: normalizePermissions(value.customPermissions),
  };
}

export async function readManagedAccounts(): Promise<StoredAccountRecord[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const stored = await redis.get(MANAGED_ACCOUNTS_KEY);
    if (!Array.isArray(stored)) return [];
    return stored.filter(isStoredAccountRecord).map(normalizeStoredAccount);
  } catch {
    return [];
  }
}

export async function saveManagedAccounts(accounts: StoredAccountRecord[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Managed auth storage unavailable');
  }

  await redis.set(MANAGED_ACCOUNTS_KEY, accounts);
}

/** 由 env 派生首批 managed 账号种子（admin + ACCOUNTS 列表） */
export function getBootstrapSeeds(): SeedAccountInput[] {
  const seeds: SeedAccountInput[] = [];
  const usernames = new Set<string>();

  if (effectiveAdminPassword) {
    usernames.add('admin');
    seeds.push({
      username: 'admin',
      password: effectiveAdminPassword,
      name: '超级管理员',
      role: 'super_admin',
      customPermissions: [],
    });
  }

  for (const account of parseBootstrapAccounts(ACCOUNTS)) {
    const username = ensureUniqueUsername(account.username, usernames, account.name);
    usernames.add(username);
    seeds.push({ ...account, username });
  }

  return seeds;
}

/** managed 模式下确保首批账号已播种，返回当前全部账号 */
export async function ensureManagedAccountsBootstrapped(): Promise<StoredAccountRecord[]> {
  if (!isManagedAuthConfigured()) return [];

  const existing = await readManagedAccounts();
  if (existing.length > 0) {
    return existing;
  }

  const bootstrapSeeds = getBootstrapSeeds();
  if (bootstrapSeeds.length === 0) {
    return [];
  }

  const now = Date.now();
  const created = await Promise.all(
    bootstrapSeeds.map((seed, index) => createStoredAccount(seed, now + index))
  );
  await saveManagedAccounts(created);
  return created;
}

/** 当前账号数；尚未播种时回退为种子数，供 loginMode 判定使用 */
export async function getManagedAccountCount(): Promise<number> {
  if (!isManagedAuthConfigured()) return 0;
  const existing = await readManagedAccounts();
  if (existing.length > 0) {
    return existing.length;
  }
  return getBootstrapSeeds().length;
}
