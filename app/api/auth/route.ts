import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/server/rate-limit';
import { logAudit } from '@/lib/server/observability';
import {
  authenticateLogin,
  createLoginResponse,
  createPremiumUnlockResponse,
  getPublicAuthConfig,
  ManagedAuthStorageError,
  validatePremiumAccess,
} from '@/lib/server/auth';

export const runtime = 'edge';

export async function GET() {
  try {
    return NextResponse.json(await getPublicAuthConfig());
  } catch (error) {
    if (error instanceof ManagedAuthStorageError) {
      return NextResponse.json(
        { error: 'Managed authentication storage is unavailable' },
        { status: 503 },
      );
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`login:${ip}`, { limit: 10, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { valid: false, message: 'Too many login attempts' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  try {
    const body = await request.json();
    const { username, password, type } = body || {};

    if (type === 'premium') {
      const valid = await validatePremiumAccess(request, { username, password });
      if (valid) {
        return createPremiumUnlockResponse();
      }
      logAudit('premium_unlock_failed', { ip });
      return NextResponse.json({ valid: false });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ valid: false, message: 'Password required' }, { status: 400 });
    }

    const session = await authenticateLogin({ username, password });
    if (!session) {
      logAudit('login_failed', { ip, username: typeof username === 'string' ? username : undefined });
      return NextResponse.json({ valid: false });
    }

    return createLoginResponse(session, request);
  } catch (error) {
    if (error instanceof ManagedAuthStorageError) {
      return NextResponse.json(
        { valid: false, message: 'Managed authentication storage is unavailable' },
        { status: 503 },
      );
    }
    return NextResponse.json({ valid: false, message: 'Invalid request' }, { status: 400 });
  }
}
