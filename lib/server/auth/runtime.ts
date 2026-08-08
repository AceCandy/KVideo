/**
 * Redis 运行时客户端。
 * 把 @upstash/redis 的依赖隔离在此模块，其余纯逻辑层不得直接引入，
 * 以保证 config / session 等 edge-safe 模块可在 middleware 复用。
 */
import { getRedisClient } from '@/lib/server/redis';
import { getRuntimeEnvValue } from '@/lib/server/runtime-env';

export { getRedisClient };

/** 获取 Upstash Redis 客户端单例；缺配置时返回 null */
/** managed 模式可用：AUTH_SECRET 存在且 Redis 客户端可建 */
export function isManagedAuthConfigured(): boolean {
  return Boolean(getRuntimeEnvValue('AUTH_SECRET')) && !!getRedisClient();
}
