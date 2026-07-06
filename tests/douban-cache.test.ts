import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildRecommendationCacheKey,
    getCachedRecommendation,
    setCachedRecommendation,
} from '../lib/server/douban-cache';

// 走无 Redis 降级路径，不依赖真实 Redis
before(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

test('buildRecommendationCacheKey：中文 tag 被编码、不同分页产出不同 key', () => {
    const k1 = buildRecommendationCacheKey({ type: 'movie', tag: '热门', pageStart: '0', pageLimit: '20' });
    const k2 = buildRecommendationCacheKey({ type: 'movie', tag: '热门', pageStart: '20', pageLimit: '20' });
    assert.notEqual(k1, k2);
    assert.ok(k1.startsWith('douban-rec:cache:'));
    // 原始中文不应直接出现在 key 中（已被编码）
    assert.ok(!k1.includes('热门'));
    assert.ok(k1.includes(encodeURIComponent('热门')));
});

test('buildRecommendationCacheKey：type 参与区分 key', () => {
    const movie = buildRecommendationCacheKey({ type: 'movie', tag: 'x', pageStart: '0', pageLimit: '20' });
    const tv = buildRecommendationCacheKey({ type: 'tv', tag: 'x', pageStart: '0', pageLimit: '20' });
    assert.notEqual(movie, tv);
});

test('buildRecommendationCacheKey：与限流 key 前缀隔离', () => {
    const key = buildRecommendationCacheKey({ type: 'movie', tag: 'x', pageStart: '0', pageLimit: '20' });
    assert.ok(!key.startsWith('ratelimit:'));
});

test('无 Redis 时 getCachedRecommendation 返回 null', async () => {
    const key = buildRecommendationCacheKey({ type: 'movie', tag: 't', pageStart: '0', pageLimit: '20' });
    const got = await getCachedRecommendation(key);
    assert.equal(got, null);
});

test('无 Redis 时 setCachedRecommendation 不抛错', async () => {
    const key = buildRecommendationCacheKey({ type: 'movie', tag: 't', pageStart: '0', pageLimit: '20' });
    await assert.doesNotReject(() => setCachedRecommendation(key, '{"subjects":[]}'));
});
