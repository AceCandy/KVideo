import { Redis } from '@upstash/redis';

/**
 * 豆瓣推荐响应的应用层缓存
 * @author AceCandy
 *
 * 命中缓存时 recommend 路由可直接返回，跳过限流计数与回源请求；
 * 未配置 Upstash Redis 或 Redis 运行时故障时安全降级（读当 MISS、写为空操作），
 * 不影响路由主流程。Redis 客户端单例自持，不从 auth/runtime 引入，保持依赖隔离。
 */

/** 缓存活时间（秒），与上游 fetch revalidate 同量级、偏短以保内容新鲜度 */
const CACHE_TTL_SEC = 1800;

/** 缓存 key 前缀，与限流 key（ratelimit:...）命名空间隔离，互不污染 */
const CACHE_KEY_PREFIX = 'douban-rec:cache';

let cachedRedis: Redis | null | undefined;

/** 惰性初始化 Redis 客户端；未配置 env 或初始化失败时返回 null */
function getRedis(): Redis | null {
    if (cachedRedis !== undefined) return cachedRedis;
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        cachedRedis = null;
        return cachedRedis;
    }
    try {
        cachedRedis = Redis.fromEnv();
        return cachedRedis;
    } catch {
        cachedRedis = null;
        return cachedRedis;
    }
}

/** recommend 缓存 key 的组成参数 */
export interface RecommendationCacheKeyParams {
    type: string;
    tag: string;
    pageStart: string;
    pageLimit: string;
}

/**
 * 构造缓存 key。
 * 各分段统一 encodeURIComponent，避免中文 tag / 特殊字符破坏 key 结构。
 */
export function buildRecommendationCacheKey({
    type,
    tag,
    pageStart,
    pageLimit,
}: RecommendationCacheKeyParams): string {
    return [
        CACHE_KEY_PREFIX,
        encodeURIComponent(type),
        encodeURIComponent(tag),
        encodeURIComponent(pageStart),
        encodeURIComponent(pageLimit),
    ].join(':');
}

/**
 * 读缓存。命中返回响应体字符串；未命中、未配置 Redis 或读取异常时返回 null。
 * 不抛错，调用方按 null 走未命中分支。
 */
export async function getCachedRecommendation(key: string): Promise<string | null> {
    const redis = getRedis();
    if (!redis) return null;
    try {
        const value = await redis.get<string>(key);
        return typeof value === 'string' ? value : null;
    } catch {
        return null;
    }
}

/**
 * 写缓存，附带 TTL。未配置 Redis 或写入异常时为空操作，不影响主流程。
 */
export async function setCachedRecommendation(key: string, body: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    try {
        await redis.set(key, body, { ex: CACHE_TTL_SEC });
    } catch {
        // 写入失败不阻断请求
    }
}
