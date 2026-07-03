import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  hasAuthConfiguredFromEnv,
  resolveSessionSecretFromEnv,
  verifySessionCookie,
} from '@/lib/auth/session-edge';

/**
 * 统一 API 鉴权门（edge runtime）。
 * 仅保护 /api/* 业务路由；页面访问由客户端 PasswordGate 处理，避免无独立登录页时的重定向死锁。
 *
 * - none 模式（未配置访问密码 / managed 前置条件）→ 全放行，保持匿名可用
 * - legacy / managed 模式 → 除登录端点与 OPTIONS 预检外，要求有效 session cookie
 *
 * 任何判定异常默认放行（fail-open），优先保证源可用性；精细角色判断仍由各路由自理。
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 仅保护 API 层；页面交给 PasswordGate
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 登录/状态端点白名单：GET 配置、POST 登录、GET/DELETE session
  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // CORS 预检不带凭证，放行
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // none 模式硬放行（不破坏匿名部署）
  if (!hasAuthConfiguredFromEnv()) {
    return NextResponse.next();
  }

  const secret = resolveSessionSecretFromEnv();
  if (!secret) {
    // 配置异常：声称有鉴权却派生不出密钥，保守放行保可用
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionCookie(token, secret);
  if (!payload) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|sw\\.js|workbox|manifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2|ttf|otf|txt|xml)).*)',
  ],
};
