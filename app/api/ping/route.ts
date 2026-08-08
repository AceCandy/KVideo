/**
 * Ping API Route - Measures latency to video sources
 * Returns response time for real-time latency display
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertSafeOutboundUrl } from '@/lib/server/url-guard';
import { probeSourceLatency } from '@/lib/api/source-latency';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
        }

        // Validate URL format
        try {
            const parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return NextResponse.json({ error: 'Unsupported URL protocol' }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        try {
            await assertSafeOutboundUrl(url);
        } catch {
            return NextResponse.json({ error: 'Blocked: target address not allowed' }, { status: 403 });
        }

        const result = await probeSourceLatency(url);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Ping error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
