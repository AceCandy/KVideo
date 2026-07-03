/**
 * Redis 运行时客户端。
 * 把 @upstash/redis 的依赖隔离在此模块，其余纯逻辑层不得直接引入，
 * 以保证 config / session 等 edge-safe 模块可在 middleware 复用。
 */
import { Redis } from '@upstash/redis';

let cachedRedis: Redis | null | undefined;

/** 获取 Upstash Redis 客户端单例；缺配置时返回 null */
export function getRedisClient(): Redis | null {
  if (cachedRedis !== undefined) {
    return cachedRedis;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    cachedRedis = null;
    return cachedRedis;
  }

  cachedRedis = Redis.fromEnv();
  return cachedRedis;
}

/** managed 模式可用：AUTH_SECRET 存在且 Redis 客户端可建 */
export function isManagedAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET) && !!getRedisClient();
}
