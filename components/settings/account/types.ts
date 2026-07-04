import type { getSession, Permission, Role } from '@/lib/store/auth-store';

export type { Permission, Role };
export type Session = ReturnType<typeof getSession>;

export type LoginMode = 'none' | 'legacy_password' | 'managed';

export interface AccountInfo {
  id: string;
  username: string;
  name: string;
  role: Role;
  customPermissions: Permission[];
  createdAt: number;
  updatedAt: number;
}

export interface EditableAccount {
  id?: string;
  username: string;
  name: string;
  role: Role;
  customPermissions: Permission[];
  password: string;
  isNew?: boolean;
  markedForDeletion?: boolean;
}

export interface LegacyConfigEntry {
  password: string;
  name: string;
  role: Role;
  customPermissions: Permission[];
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  source_management: '视频源管理',
  account_management: '账户管理',
  danmaku_api: '弹幕 API',
  data_management: '数据管理',
  player_settings: '播放器设置',
  danmaku_appearance: '弹幕外观',
  view_settings: '显示设置',
  iptv_access: 'IPTV 访问',
  iptv_source_management: 'IPTV 自定义源管理',
  iptv_builtin_sources: 'IPTV 内置源',
};
