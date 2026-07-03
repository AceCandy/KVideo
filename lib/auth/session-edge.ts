/**
 * Edge-safe session 工具集。
 * 仅依赖 env 与 WebCrypto（经 auth-helpers），不引入 @upstash/redis 或 server-only，
 * 供 middleware.ts 在 edge runtime 复用鉴权判定。所有逻辑须与 lib/server/auth.ts 保持一致。
 */
import { verifySessionToken, type SessionPayload } from '@/lib/server/auth-helpers';

/** session cookie 名，须与 lib/server/auth.ts 保持一致 */
export const SESSION_COOKIE_NAME = 'kvideo_session';

/**
 * 基于 env 推断当前部署是否启用了访问鉴权（非 none 模式）。
 * 复刻 app/layout.tsx 中 PasswordGate 的 SSR hasAuth 兜底逻辑，
 * 保证 middleware 与前端锁屏判定一致；不调用 Redis，edge 可用。
 */
export function hasAuthConfiguredFromEnv(): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ACCESS_PASSWORD;
  const accounts = process.env.ACCOUNTS;
  const managedReady = Boolean(
    process.env.AUTH_SECRET &&
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
  );
  return Boolean(adminPassword || accounts || managedReady);
}

/**
 * 基于 env 派生 session 验签密钥。
 * 与 lib/server/auth.ts 的 resolveSessionSecret 等价：
 *   - managed 模式（AUTH_SECRET 存在）→ AUTH_SECRET
 *   - legacy 模式 → legacy:${ADMIN_PASSWORD||ACCESS_PASSWORD}:${ACCOUNTS}:${PREMIUM_PASSWORD}
 * 无密钥时返回 null（调用方应已通过 hasAuthConfiguredFromEnv 兜底）。
 */
export function resolveSessionSecretFromEnv(): string | null {
  const authSecret = process.env.AUTH_SECRET;
  if (authSecret) return authSecret;

  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ACCESS_PASSWORD || '';
  const accounts = process.env.ACCOUNTS || '';
  if (!adminPassword && !accounts) return null;

  return `legacy:${adminPassword}:${accounts}:${process.env.PREMIUM_PASSWORD || ''}`;
}

/** 验证 session cookie 值；空值或验签/过期失败均返回 null */
export async function verifySessionCookie(
  cookieValue: string | undefined,
  secret: string
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  return verifySessionToken(cookieValue, secret);
}

export { verifySessionToken };
export type { SessionPayload };
