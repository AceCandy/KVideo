import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { rateLimit, getClientIp, buildRateLimitKey } from '../lib/server/rate-limit';

// 确保测试走内存降级路径，不依赖真实 Redis
before(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

function uniqueKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

test('rateLimit：limit 内放行，remaining 递减', async () => {
  const key = uniqueKey('allow');
  const first = await rateLimit(key, { limit: 3, windowSec: 60 });
  assert.equal(first.success, true);
  assert.equal(first.remaining, 2);
  const second = await rateLimit(key, { limit: 3, windowSec: 60 });
  assert.equal(second.success, true);
  assert.equal(second.remaining, 1);
});

test('rateLimit：超过 limit 拒绝，retryAfter > 0', async () => {
  const key = uniqueKey('deny');
  await rateLimit(key, { limit: 2, windowSec: 60 });
  await rateLimit(key, { limit: 2, windowSec: 60 });
  const third = await rateLimit(key, { limit: 2, windowSec: 60 });
  assert.equal(third.success, false);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfter > 0);
});

test('rateLimit：不同 key 计数互不影响', async () => {
  const k1 = uniqueKey('k1');
  const k2 = uniqueKey('k2');
  await rateLimit(k1, { limit: 1, windowSec: 60 });
  const r1 = await rateLimit(k1, { limit: 1, windowSec: 60 });
  const r2 = await rateLimit(k2, { limit: 1, windowSec: 60 });
  assert.equal(r1.success, false);
  assert.equal(r2.success, true);
});

test('getClientIp：x-forwarded-for 多段取首个', () => {
  const req = new NextRequest('https://example.com/api/x', {
    headers: { 'x-forwarded-for': '203.0.113.5, 198.51.100.1' },
  });
  assert.equal(getClientIp(req), '203.0.113.5');
});

test('getClientIp：无 xff 且无 request.ip 回退 unknown', () => {
  const req = new NextRequest('https://example.com/api/x');
  assert.equal(getClientIp(req), 'unknown');
});

test('buildRateLimitKey 拼接 scope 与 identifier', () => {
  assert.equal(buildRateLimitKey('login', '1.2.3.4'), 'login:1.2.3.4');
});
