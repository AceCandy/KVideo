import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/server/rate-limit';
import { authenticationRequiredResponse } from '@/lib/server/api-responses';
import { getServerSession } from '@/lib/server/auth';

// 确保这行代码在整个文件中只出现一次
export const runtime = 'edge';

const redis = Redis.fromEnv();

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`sync:${ip}`, { limit: 30, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const session = await getServerSession(request);
  const profileId = session?.profileId;
  
  if (!profileId) {
    return authenticationRequiredResponse();
  }

  try {
    const data = await redis.get(`user:sync:${profileId}`);
    return NextResponse.json({ 
      success: true, 
      data: data || { history: [], favorites: [] } 
    });
  } catch (error) {
    console.error('Redis Get Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sync data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`sync:${ip}`, { limit: 30, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const session = await getServerSession(request);
  const profileId = session?.profileId;
  
  if (!profileId) {
    return authenticationRequiredResponse();
  }

  try {
    const body = await request.json();
    const { history, favorites } = body;

    await redis.set(`user:sync:${profileId}`, { history, favorites });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Redis Set Error:', error);
    return NextResponse.json({ error: 'Failed to save sync data' }, { status: 500 });
  }
}
