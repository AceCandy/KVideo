import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/server/rate-limit';
import {
  deleteManagedAccount,
  getPublicAuthConfig,
  getServerSession,
  isSuperAdminSession,
  updateManagedAccount,
} from '@/lib/server/auth';
import { logAudit } from '@/lib/server/observability';

export const runtime = 'edge';

async function requireManagedSuperAdmin(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  if (!isSuperAdminSession(session)) {
    return { error: NextResponse.json({ error: 'Super admin required' }, { status: 403 }) };
  }

  const config = await getPublicAuthConfig();
  if (config.loginMode !== 'managed') {
    return { error: NextResponse.json({ error: 'Managed account mode is not enabled' }, { status: 400 }) };
  }

  return { session };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`acct:${ip}`, { limit: 10, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const auth = await requireManagedSuperAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { accountId } = await context.params;
    const body = await request.json();
    const account = await updateManagedAccount(accountId, body);
    logAudit('account_update', { accountId });
    return NextResponse.json({ account });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update account' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`acct:${ip}`, { limit: 10, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const auth = await requireManagedSuperAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { accountId } = await context.params;
    await deleteManagedAccount(accountId);
    logAudit('account_delete', { accountId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete account' },
      { status: 400 }
    );
  }
}
