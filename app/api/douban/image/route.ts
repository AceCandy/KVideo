import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/server/rate-limit';
import { assertSafeOutboundUrl } from '@/lib/server/url-guard';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const rl = await rateLimit(`douban-img:${ip}`, { limit: 600, windowSec: 60 });
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
        );
    }
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
    }

    try {
        await assertSafeOutboundUrl(imageUrl);
    } catch {
        return NextResponse.json({ error: 'Blocked: target address not allowed' }, { status: 403 });
    }

    try {
        const imageResponse = await fetch(imageUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                Accept: 'image/jpeg,image/png,image/gif,*/*;q=0.8',
                Referer: 'https://movie.douban.com/',
            },
        });

        if (!imageResponse.ok) {
            return NextResponse.json(
                { error: imageResponse.statusText },
                { status: imageResponse.status }
            );
        }

        const contentType = imageResponse.headers.get('content-type');

        if (!imageResponse.body) {
            return NextResponse.json(
                { error: 'Image response has no body' },
                { status: 500 }
            );
        }

        // 创建响应头
        const headers = new Headers();
        if (contentType) {
            headers.set('Content-Type', contentType);
        }

        // 设置缓存头
        headers.set('Cache-Control', 'public, max-age=15720000, s-maxage=15720000');

        // 直接返回图片流
        // @ts-expect-error ReadableStream 赋给 Response init 的已知类型缺口
        return new Response(imageResponse.body, {
            status: 200,
            headers,
        });
    } catch {
        return NextResponse.json(
            { error: 'Error fetching image' },
            { status: 500 }
        );
    }
}
