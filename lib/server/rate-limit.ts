import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

/** 限流配置 */
export interface RateLimitOptions {
  /** 窗口内最大允许次数 */
  limit: number;
  /** 窗口大小（秒） */
  windowSec: number;
}

/** 限流结果 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** 距下次可请求的秒数（0 表示当前已被允许） */
  retryAfter: number;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

// 无 Redis 时的进程内固定窗口存储；单实例有效，多实例下宽松可接受
const memoryBuckets = new Map<string, MemoryBucket>();
const MEMORY_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastMemoryCleanup = 0;

let cachedRedis: Redis | null | undefined;

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

/**
 * 固定窗口限流。优先 Redis（跨实例一致），无 Redis 或 Redis 故障时降级为进程内计数。
 * 不抛错；调用方据 success 决定是否返回 429。
 */
export async function rateLimit(
  key: string,
  { limit, windowSec }: RateLimitOptions
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = `ratelimit:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }
      const success = count <= limit;
      return {
        success,
        remaining: Math.max(0, limit - count),
        retryAfter: success ? 0 : windowSec,
      };
    } catch {
      // Redis 故障，降级内存
    }
  }
  return memoryRateLimit(key, limit, windowSec);
}

function memoryRateLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  if (now - lastMemoryCleanup > MEMORY_CLEANUP_INTERVAL_MS) {
    for (const [bucketKey, bucket] of memoryBuckets) {
      if (bucket.resetAt <= now) memoryBuckets.delete(bucketKey);
    }
    lastMemoryCleanup = now;
  }

  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { success: 1 <= limit, remaining: Math.max(0, limit - 1), retryAfter: 0 };
  }

  existing.count += 1;
  const success = existing.count <= limit;
  return {
    success,
    remaining: Math.max(0, limit - existing.count),
    retryAfter: success ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * 获取客户端 IP。优先 cf-connecting-ip（Cloudflare 直填的真实客户端 IP，最可信），
 * 其次 x-forwarded-for 首段（其他反向代理），再回退 request.ip，最后 'unknown'。
 */
export function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (request as { ip?: string }).ip || 'unknown';
}

/** 构造带作用域前缀的限流 key，避免不同端点计数互相污染 */
export function buildRateLimitKey(scope: string, identifier: string): string {
  return `${scope}:${identifier}`;
}
