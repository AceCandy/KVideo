/**
 * 鉴权配置层（edge-safe）。
 * 仅依赖 env 与 WebCrypto，不引入 @upstash/redis，也不依赖 server-only，
 * 可供 middleware / session-edge 直接复用。
 * 判定函数均在调用时动态读取 env，便于单元测试覆盖；
 * 进程级固定不变的配置常量单独列出，供 service/repository 消费。
 */

/** session cookie 名，须与前端、middleware 共用 */
export const SESSION_COOKIE_NAME = 'kvideo_session';

/** premium 解锁 cookie 名，httpOnly、浏览器会话级，由后端在校验通过后下发 */
export const PREMIUM_COOKIE_NAME = 'kvideo_premium';

/** 运行时配置（进程启动后 env 固定） */
export const PREMIUM_PASSWORD = process.env.PREMIUM_PASSWORD || '';
export const PERSIST_SESSION = process.env.PERSIST_SESSION !== 'false';
export const SUBSCRIPTION_SOURCES =
  process.env.SUBSCRIPTION_SOURCES || process.env.NEXT_PUBLIC_SUBSCRIPTION_SOURCES || '';
export const IPTV_SOURCES = process.env.IPTV_SOURCES || process.env.NEXT_PUBLIC_IPTV_SOURCES || '';
export const MERGE_SOURCES = process.env.MERGE_SOURCES || process.env.NEXT_PUBLIC_MERGE_SOURCES || '';
export const DANMAKU_API_URL =
  process.env.DANMAKU_API_URL || process.env.NEXT_PUBLIC_DANMAKU_API_URL || '';

/** 管理员密码取 ADMIN_PASSWORD，缺省回退 ACCESS_PASSWORD */
export const effectiveAdminPassword = process.env.ADMIN_PASSWORD || process.env.ACCESS_PASSWORD || '';
export const ACCOUNTS = process.env.ACCOUNTS || '';

export type LoginMode = 'none' | 'legacy_password' | 'managed';

/** managed 模式前置条件：AUTH_SECRET + Upstash 配置齐备（纯 env，不实例化 Redis） */
export function isManagedAuthConfiguredFromEnv(): boolean {
  return Boolean(
    process.env.AUTH_SECRET && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function isLegacyAuthConfigured(): boolean {
  return Boolean(
    (process.env.ADMIN_PASSWORD || process.env.ACCESS_PASSWORD) || process.env.ACCOUNTS
  );
}

/**
 * 基于 env 推断是否启用访问鉴权（非 none 模式）。
 * 与前端 PasswordGate SSR 兜底及 middleware 判定保持一致；不调用 Redis，edge 可用。
 */
export function hasAuthConfigured(): boolean {
  return Boolean(
    (process.env.ADMIN_PASSWORD || process.env.ACCESS_PASSWORD) ||
      process.env.ACCOUNTS ||
      isManagedAuthConfiguredFromEnv()
  );
}

/** 纯 env 派生 session 验签密钥（不依赖 loginMode / Redis） */
export function resolveSessionSecretFromEnv(): string | null {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ACCESS_PASSWORD || '';
  const accounts = process.env.ACCOUNTS || '';
  if (!adminPassword && !accounts) return null;
  return `legacy:${adminPassword}:${accounts}:${process.env.PREMIUM_PASSWORD || ''}`;
}

/**
 * premium token 验签密钥：AUTH_SECRET 优先，否则由 PREMIUM_PASSWORD 派生。
 * 保证 premium-only 部署（仅设 PREMIUM_PASSWORD）也能签发与校验，不依赖 session 密钥。
 */
export function resolvePremiumSecretFromEnv(): string | null {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (!process.env.PREMIUM_PASSWORD) return null;
  return `premium:${process.env.PREMIUM_PASSWORD}`;
}

function buildLegacyProfileIdInput(password: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(`${password}kvideo-profile-salt-v1`);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** legacy 模式下由密码确定生成稳定 profileId，避免引入额外存储 */
export async function generateLegacyProfileId(password: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buildLegacyProfileIdInput(password));
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
