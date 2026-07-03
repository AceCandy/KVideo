/**
 * 鉴权模块对外聚合入口（barrel）。
 * 实现已按职责拆分到 lib/server/auth/ 子目录：
 *   config / runtime / account-repository / session / service
 * 这里仅做 re-export，保持 `@/lib/server/auth` 的对外 API 与历史 import 路径不变。
 */
export type { LoginMode } from '@/lib/server/auth/config';
export type { ServerAuthSession, PublicSessionData } from '@/lib/server/auth/session';
export {
  getServerSession,
  toPublicSession,
  clearSessionCookie,
  logoutResponse,
} from '@/lib/server/auth/session';
export type { PublicAuthConfig, AccountInfo } from '@/lib/server/auth/service';
export {
  getPublicAuthConfig,
  hasServerPermission,
  isSuperAdminSession,
  authenticateLogin,
  validatePremiumAccess,
  createLoginResponse,
  createSessionStatusResponse,
  listAccountInfo,
  createManagedAccount,
  updateManagedAccount,
  deleteManagedAccount,
} from '@/lib/server/auth/service';
