import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/server/rate-limit';
import {
  buildRecommendationCacheKey,
  getCachedRecommendation,
  setCachedRecommendation,
} from '@/lib/server/douban-cache';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag') || '热门';
  const pageLimit = searchParams.get('page_limit') || '20';
  const pageStart = searchParams.get('page_start') || '0';
  const type = searchParams.get('type') || 'movie'; // movie or tv

  // 命中应用层缓存：直接返回，跳过限流计数与回源请求
  const cacheKey = buildRecommendationCacheKey({ type, tag, pageStart, pageLimit });
  const cached = await getCachedRecommendation(cacheKey);
  if (cached) {
    try {
      return NextResponse.json(JSON.parse(cached));
    } catch {
      // 缓存体损坏则按未命中继续走回源
    }
  }

  const rl = await rateLimit(`douban-rec:${ip}`, { limit: 200, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const url = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://movie.douban.com/',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Douban API returned ${response.status}`);
    }

    const data = await response.json();

    // 转换图片链接使用代理
    if (data.subjects && Array.isArray(data.subjects)) {
      data.subjects = (data.subjects as Array<{ cover?: string }>).map((item) => ({
        ...item,
        cover: item.cover ? `/api/douban/image?url=${encodeURIComponent(item.cover)}` : item.cover,
      }));
    }

    // 写回应用层缓存，供后续命中跳过限流与回源
    await setCachedRecommendation(cacheKey, JSON.stringify(data));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Douban API error:', error);
    return NextResponse.json(
      { subjects: [], error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
