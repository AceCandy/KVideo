/**
 * 鉴权业务编排层（service）。
 * 组合 config / repository / session，承载登录认证、premium 校验、账号 CRUD、
 * 对外配置装配与登录响应构造。路由层只与本模块交互。
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  createStoredAccount,
  hashPassword,
  normalizeUsername,
  parseBootstrapAccounts,
  verifyPassword,
  type StoredAccountRecord,
} from '@/lib/server/auth-helpers';
import {
  hasResolvedPermission,
  normalizePermissions,
  normalizeRole,
  type Permission,
  type Role,
} from '@/lib/auth/permissions';
import {
  ACCOUNTS,
  PREMIUM_PASSWORD,
  PERSIST_SESSION,
  SUBSCRIPTION_SOURCES,
  IPTV_SOURCES,
  MERGE_SOURCES,
  DANMAKU_API_URL,
  effectiveAdminPassword,
  generateLegacyProfileId,
  isLegacyAuthConfigured,
  type LoginMode,
} from '@/lib/server/auth/config';
import { getRuntimeFeatures } from '@/lib/server/runtime-features';
import {
  ensureManagedAccountsBootstrapped,
  getManagedAccountCount,
  saveManagedAccounts,
} from '@/lib/server/auth/account-repository';
import { isManagedAuthConfigured } from '@/lib/server/auth/runtime';
import {
  applySessionCookie,
  getServerSession,
  signSession,
  toPublicSession,
  type ServerAuthSession,
} from '@/lib/server/auth/session';

export interface PublicRuntimeConfig {
  persistSession: boolean;
  subscriptionSources: string;
  iptvSources: string;
  mergeSources: string;
  danmakuApiUrl: string;
}

function getPublicRuntimeConfig(): PublicRuntimeConfig {
  const runtimeFeatures = getRuntimeFeatures();
  return {
    persistSession: PERSIST_SESSION,
    subscriptionSources: SUBSCRIPTION_SOURCES,
    iptvSources: runtimeFeatures.iptvEnabled ? IPTV_SOURCES : '',
    mergeSources: MERGE_SOURCES,
    danmakuApiUrl: DANMAKU_API_URL,
  };
}

export interface PublicAuthConfig extends PublicRuntimeConfig {
  hasAuth: boolean;
  hasPremiumAuth: boolean;
  loginMode: LoginMode;
}

export interface AccountInfo {
  id: string;
  username: string;
  name: string;
  role: Role;
  customPermissions: Permission[];
  createdAt: number;
  updatedAt: number;
}

export async function getPublicAuthConfig(): Promise<PublicAuthConfig> {
  const managedAccountCount = await getManagedAccountCount();
  const loginMode: LoginMode = managedAccountCount > 0
    ? 'managed'
    : isLegacyAuthConfigured()
      ? 'legacy_password'
      : 'none';

  return {
    hasAuth: loginMode !== 'none',
    hasPremiumAuth: !!PREMIUM_PASSWORD,
    loginMode,
    ...getPublicRuntimeConfig(),
  };
}

async function authenticateManagedLogin(username: string, password: string): Promise<ServerAuthSession | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername || !password) return null;

  const accounts = await ensureManagedAccountsBootstrapped();
  const account = accounts.find((item) => item.username === normalizedUsername);
  if (!account) return null;

  const valid = await verifyPassword(password, account.passwordSalt, account.passwordHash);
  if (!valid) return null;

  return {
    accountId: account.id,
    profileId: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    customPermissions: account.customPermissions,
    mode: 'managed',
    iat: Date.now(),
  };
}

async function authenticateLegacyLogin(password: string): Promise<ServerAuthSession | null> {
  if (!password) return null;

  if (effectiveAdminPassword && password === effectiveAdminPassword) {
    return {
      accountId: 'legacy-admin',
      profileId: await generateLegacyProfileId(password),
      username: 'admin',
      name: '超级管理员',
      role: 'super_admin',
      customPermissions: [],
      mode: 'legacy',
      iat: Date.now(),
    };
  }

  for (const account of parseBootstrapAccounts(ACCOUNTS)) {
    if (account.password !== password) continue;
    return {
      accountId: `legacy:${account.username}`,
      profileId: await generateLegacyProfileId(password),
      username: account.username,
      name: account.name,
      role: account.role,
      customPermissions: account.customPermissions,
      mode: 'legacy',
      iat: Date.now(),
    };
  }

  return null;
}

export async function authenticateLogin(body: { username?: string; password?: string }): Promise<ServerAuthSession | null> {
  const config = await getPublicAuthConfig();
  if (config.loginMode === 'managed') {
    return authenticateManagedLogin(body.username || '', body.password || '');
  }

  if (config.loginMode === 'legacy_password') {
    return authenticateLegacyLogin(body.password || '');
  }

  return null;
}

async function authenticateManagedAdminCredential(username: string, password: string): Promise<boolean> {
  const session = await authenticateManagedLogin(username, password);
  return !!session && (session.role === 'super_admin' || session.role === 'admin');
}

async function authenticateLegacyAdminCredential(password: string): Promise<boolean> {
  const session = await authenticateLegacyLogin(password);
  return !!session && (session.role === 'super_admin' || session.role === 'admin');
}

export async function validatePremiumAccess(
  request: NextRequest,
  body: { username?: string; password?: string }
): Promise<boolean> {
  const session = await getServerSession(request);
  if (session && (session.role === 'super_admin' || session.role === 'admin')) {
    return true;
  }

  if (!PREMIUM_PASSWORD) {
    return true;
  }

  if (!body.password || typeof body.password !== 'string') {
    return false;
  }

  if (body.password === PREMIUM_PASSWORD) {
    return true;
  }

  const config = await getPublicAuthConfig();
  if (config.loginMode === 'managed') {
    if (!body.username) return false;
    return authenticateManagedAdminCredential(body.username, body.password);
  }

  return authenticateLegacyAdminCredential(body.password);
}

export function hasServerPermission(session: ServerAuthSession, permission: Permission): boolean {
  return hasResolvedPermission(session.role, permission, session.customPermissions);
}

export function isSuperAdminSession(session: ServerAuthSession): boolean {
  return session.role === 'super_admin';
}

export async function createLoginResponse(session: ServerAuthSession): Promise<NextResponse> {
  const config = await getPublicAuthConfig();
  const token = await signSession(session);
  if (!token) {
    return NextResponse.json({ valid: false, message: 'Session signing unavailable' }, { status: 500 });
  }

  const response = NextResponse.json({
    valid: true,
    session: toPublicSession(session),
    ...config,
  });

  applySessionCookie(response, token, PERSIST_SESSION);
  return response;
}

export async function createSessionStatusResponse(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(request);
  const config = await getPublicAuthConfig();

  return NextResponse.json({
    authenticated: !!session,
    session: session ? toPublicSession(session) : null,
    ...config,
  });
}

export async function listAccountInfo(): Promise<AccountInfo[]> {
  const config = await getPublicAuthConfig();

  if (config.loginMode === 'managed') {
    const accounts = await ensureManagedAccountsBootstrapped();
    return accounts.map((account) => ({
      id: account.id,
      username: account.username,
      name: account.name,
      role: account.role,
      customPermissions: account.customPermissions,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));
  }

  const legacyAccounts: AccountInfo[] = [];
  let index = 0;

  if (effectiveAdminPassword) {
    legacyAccounts.push({
      id: 'legacy-admin',
      username: 'admin',
      name: '超级管理员',
      role: 'super_admin',
      customPermissions: [],
      createdAt: 0,
      updatedAt: 0,
    });
    index += 1;
  }

  for (const account of parseBootstrapAccounts(ACCOUNTS)) {
    legacyAccounts.push({
      id: `legacy-${index}`,
      username: account.username,
      name: account.name,
      role: account.role,
      customPermissions: account.customPermissions,
      createdAt: 0,
      updatedAt: 0,
    });
    index += 1;
  }

  return legacyAccounts;
}

function sanitizeAccountInput(body: unknown): {
  username?: string;
  name?: string;
  password?: string;
  role?: Role;
  customPermissions?: Permission[];
} {
  if (!body || typeof body !== 'object') return {};
  const input = body as Record<string, unknown>;

  return {
    username: typeof input.username === 'string' ? normalizeUsername(input.username) : undefined,
    name: typeof input.name === 'string' ? input.name.trim() : undefined,
    password: typeof input.password === 'string' ? input.password : undefined,
    role: typeof input.role === 'string' ? normalizeRole(input.role) : undefined,
    customPermissions: Array.isArray(input.customPermissions)
      ? normalizePermissions(input.customPermissions as string[])
      : undefined,
  };
}

function ensureOneSuperAdmin(accounts: StoredAccountRecord[]): void {
  const count = accounts.filter((account) => account.role === 'super_admin').length;
  if (count === 0) {
    throw new Error('At least one super admin account is required');
  }
}

export async function createManagedAccount(body: unknown): Promise<AccountInfo> {
  if (!isManagedAuthConfigured()) {
    throw new Error('Managed accounts unavailable');
  }

  const input = sanitizeAccountInput(body);
  if (!input.username || !input.name || !input.password || !input.role) {
    throw new Error('Username, name, password and role are required');
  }

  const accounts = await ensureManagedAccountsBootstrapped();
  if (accounts.some((account) => account.username === input.username)) {
    throw new Error('Username already exists');
  }

  const created = await createStoredAccount({
    username: input.username,
    password: input.password,
    name: input.name,
    role: input.role,
    customPermissions: input.customPermissions || [],
  });

  const nextAccounts = [...accounts, created];
  ensureOneSuperAdmin(nextAccounts);
  await saveManagedAccounts(nextAccounts);

  return {
    id: created.id,
    username: created.username,
    name: created.name,
    role: created.role,
    customPermissions: created.customPermissions,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export async function updateManagedAccount(accountId: string, body: unknown): Promise<AccountInfo> {
  if (!isManagedAuthConfigured()) {
    throw new Error('Managed accounts unavailable');
  }

  const input = sanitizeAccountInput(body);
  const accounts = await ensureManagedAccountsBootstrapped();
  const accountIndex = accounts.findIndex((account) => account.id === accountId);
  if (accountIndex === -1) {
    throw new Error('Account not found');
  }

  const current = accounts[accountIndex];
  const updated: StoredAccountRecord = {
    ...current,
    name: input.name || current.name,
    role: input.role || current.role,
    customPermissions: input.customPermissions ?? current.customPermissions,
    updatedAt: Date.now(),
  };

  if (input.password) {
    const password = await hashPassword(input.password);
    updated.passwordHash = password.hash;
    updated.passwordSalt = password.salt;
  }

  const nextAccounts = accounts.map((account) => (account.id === accountId ? updated : account));
  ensureOneSuperAdmin(nextAccounts);
  await saveManagedAccounts(nextAccounts);

  return {
    id: updated.id,
    username: updated.username,
    name: updated.name,
    role: updated.role,
    customPermissions: updated.customPermissions,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function deleteManagedAccount(accountId: string): Promise<void> {
  if (!isManagedAuthConfigured()) {
    throw new Error('Managed accounts unavailable');
  }

  const accounts = await ensureManagedAccountsBootstrapped();
  const nextAccounts = accounts.filter((account) => account.id !== accountId);
  if (nextAccounts.length === accounts.length) {
    throw new Error('Account not found');
  }

  ensureOneSuperAdmin(nextAccounts);
  await saveManagedAccounts(nextAccounts);
}
