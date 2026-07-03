/**
 * session 签发/验证与 cookie 处理。
 * 依赖 config 的纯 env 密钥派生，不触碰 service，避免循环依赖。
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  signSessionPayload,
  verifySessionToken,
  SESSION_MAX_AGE_SECONDS,
  type SessionPayload,
} from '@/lib/server/auth-helpers';
import { normalizePermissions, type Permission, type Role } from '@/lib/auth/permissions';
import {
  SESSION_COOKIE_NAME,
  PERSIST_SESSION,
  resolveSessionSecretFromEnv,
} from '@/lib/server/auth/config';

export interface ServerAuthSession {
  accountId: string;
  profileId: string;
  username?: string;
  name: string;
  role: Role;
  customPermissions: Permission[];
  mode: 'managed' | 'legacy';
  iat: number;
}

export interface PublicSessionData {
  accountId: string;
  profileId: string;
  username?: string;
  name: string;
  role: Role;
  customPermissions?: Permission[];
  mode: 'managed' | 'legacy';
}

function sessionPayloadToServerSession(payload: SessionPayload): ServerAuthSession {
  return {
    accountId: payload.accountId,
    profileId: payload.profileId,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    customPermissions: normalizePermissions(payload.customPermissions),
    mode: payload.mode,
    iat: payload.iat,
  };
}

export function toPublicSession(session: ServerAuthSession): PublicSessionData {
  return {
    accountId: session.accountId,
    profileId: session.profileId,
    username: session.username,
    name: session.name,
    role: session.role,
    customPermissions: session.customPermissions.length > 0 ? session.customPermissions : undefined,
    mode: session.mode,
  };
}

/** 用纯 env 派生密钥签发 session token；无密钥返回 null */
export async function signSession(session: ServerAuthSession): Promise<string | null> {
  const secret = resolveSessionSecretFromEnv();
  if (!secret) return null;

  return signSessionPayload(
    {
      accountId: session.accountId,
      profileId: session.profileId,
      username: session.username,
      name: session.name,
      role: session.role,
      customPermissions: session.customPermissions,
      mode: session.mode,
      iat: session.iat,
    },
    secret
  );
}

export async function getServerSession(request: NextRequest): Promise<ServerAuthSession | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = resolveSessionSecretFromEnv();
  if (!secret) return null;

  const payload = await verifySessionToken(token, secret);
  if (!payload) return null;

  return sessionPayloadToServerSession(payload);
}

export function applySessionCookie(response: NextResponse, token: string, persist: boolean): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(persist ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  });
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export function logoutResponse(): NextResponse {
  return clearSessionCookie(NextResponse.json({ success: true }));
}
