/**
 * Edge-safe session 工具集（middleware 专用）。
 * 复用 auth/config 的纯 env 判定与密钥派生，避免与主鉴权模块逻辑漂移；
 * 自身仅依赖 auth-helpers 的 WebCrypto，不引入 @upstash/redis。
 */
import { verifySessionToken, type SessionPayload } from '@/lib/server/auth-helpers';

export { SESSION_COOKIE_NAME, resolveSessionSecretFromEnv } from '@/lib/server/auth/config';
export { hasAuthConfigured as hasAuthConfiguredFromEnv } from '@/lib/server/auth/config';

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
