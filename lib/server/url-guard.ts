/**
 * 出站地址安全过滤（SSRF 防护）
 * @author AceCandy
 *
 * 在所有对"用户可控 URL"发起 fetch 的位置调用 assertSafeOutboundUrl，
 * 拦截内网 / 链路本地 / 元数据 / 非公网目标，放行公网 http/https 源。
 *
 * 设计约束：
 * - 核心校验为纯函数，不静态依赖 node 模块，保证 edge runtime 构建通过。
 * - DNS 解析作为增强，运行时按能力动态加载 node:dns，不可用则降级为
 *   hostname/IP 字面量校验。
 * - 残留风险：DNS rebinding（校验与 fetch 两次解析结果不一致）不在本版本防护范围；
 *   彻底防护需改变 redirect/agent 行为，会破坏视频源兼容性。
 */

import { logAudit, sanitizeUrlForLog } from '@/lib/server/observability';

/** 仅允许 http/https 协议，拦截 file/ftp/gopher 等 */
export function isAllowedProtocol(scheme: string): boolean {
    return scheme === 'http:' || scheme === 'https:';
}

const BLOCKED_HOSTNAMES = new Set(['localhost']);
const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.arpa', '.localhost'];
const BLOCKED_HOST_PREFIXES = ['metadata.'];

/** hostname 字符串级黑名单：明显内网别名与元数据主机 */
export function isBlockedHostname(host: string): boolean {
    const h = host.toLowerCase();
    if (!h) return true;
    if (BLOCKED_HOSTNAMES.has(h)) return true;
    if (BLOCKED_HOST_SUFFIXES.some(s => h.endsWith(s))) return true;
    if (BLOCKED_HOST_PREFIXES.some(p => h.startsWith(p))) return true;
    return false;
}

/** 解析 IPv4 字面量为 4 个 octet；非法返回 null */
export function parseIPv4(host: string): [number, number, number, number] | null {
    const parts = host.split('.');
    if (parts.length !== 4) return null;
    const octets: number[] = [];
    for (const p of parts) {
        if (!/^\d{1,3}$/.test(p)) return null;
        if (p.length > 1 && p.startsWith('0')) return null; // 拒绝八进制歧义
        const n = Number(p);
        if (n > 255) return null;
        octets.push(n);
    }
    return [octets[0], octets[1], octets[2], octets[3]];
}

/** IPv4 私有 / 保留 / 组播段判定 */
export function isPrivateIPv4(o: number[]): boolean {
    const [a, b] = o;
    if (a === 0) return true;                           // 0.0.0.0/8
    if (a === 10) return true;                          // 10/8
    if (a === 127) return true;                         // 127/8 loopback
    if (a === 169 && b === 254) return true;            // 169.254/16 link-local + 云 metadata
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16/12
    if (a === 192 && b === 168) return true;            // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true;  // 100.64/10 CGNAT
    if (a >= 224) return true;                          // 224/4 组播 + 240/4 保留 + 广播
    return false;
}

/**
 * IPv6 私有 / 保留段判定（基于字面量前缀）
 * 保守策略：无法解析的字面量一律视为私有（拒绝）
 */
export function isPrivateIPv6(host: string): boolean {
    const h = host.toLowerCase();
    if (h === '::1' || h === '::') return true;         // loopback / unspecified
    // IPv4-mapped：::ffff:a.b.c.d
    const mapped = h.match(/ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) {
        const v4 = parseIPv4(mapped[1]);
        if (v4) return isPrivateIPv4(v4);
    }
    const firstRaw = h.split(':')[0];
    const first = firstRaw === '' ? 0 : parseInt(firstRaw, 16);
    if (Number.isNaN(first)) return true;               // 解析失败，保守拦
    if (first >= 0xfc00 && first <= 0xfdff) return true;// fc00::/7 ULA
    if (first >= 0xfe80 && first <= 0xfebf) return true;// fe80::/10 link-local
    if (first >= 0xff00) return true;                   // ff00::/8 组播
    return false;
}

export class SsrfGuardError extends Error {
    constructor(public reason: string) {
        super(`SSRF guard: ${reason}`);
        this.name = 'SsrfGuardError';
    }
}

/**
 * DNS 解析增强：校验域名解析结果不含私有地址。
 * 解析失败时降级放行，交由 fetch 自然失败（避免 DNS 抖动误伤合法源）。
 */
async function assertPublicResolvable(host: string): Promise<void> {
    const dns = await import('node:dns/promises').catch(() => null);
    if (!dns) return; // node:dns 不可用（部分 edge 平台），降级为字面量校验
    let entries: { address: string; family: number }[];
    try {
        entries = await dns.lookup(host, { all: true });
    } catch {
        return; // NXDOMAIN / 超时等：放行，由 fetch 自然失败
    }
    for (const e of entries) {
        if (e.family === 4) {
            const v4 = parseIPv4(e.address);
            if (v4 && isPrivateIPv4(v4)) {
                throw new SsrfGuardError(`host resolves to private address ${e.address}`);
            }
        } else if (isPrivateIPv6(e.address)) {
            throw new SsrfGuardError(`host resolves to private address ${e.address}`);
        }
    }
}

/**
 * 校验出站 URL 是否安全；不安全则抛 SsrfGuardError。
 * 在每个对用户可控 URL 发起 fetch 的位置、fetch 之前调用。
 * 拦截时记审计日志，便于追溯攻击与误伤。
 */
export async function assertSafeOutboundUrl(rawUrl: string): Promise<void> {
    try {
        await assertSafeOutboundUrlImpl(rawUrl);
    } catch (error) {
        if (error instanceof SsrfGuardError) {
            logAudit('ssrf_blocked', { url: sanitizeUrlForLog(rawUrl), reason: error.reason });
        }
        throw error;
    }
}

async function assertSafeOutboundUrlImpl(rawUrl: string): Promise<void> {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new SsrfGuardError('invalid url');
    }
    if (!isAllowedProtocol(parsed.protocol)) {
        throw new SsrfGuardError(`protocol not allowed: ${parsed.protocol}`);
    }
    // URL.hostname 对 IPv6 可能含方括号，统一去除
    const host = parsed.hostname.toLowerCase().replace(/[\[\]]/g, '');
    if (isBlockedHostname(host)) {
        throw new SsrfGuardError(`blocked hostname: ${host}`);
    }
    if (host.includes(':')) {
        if (isPrivateIPv6(host)) throw new SsrfGuardError(`private ipv6: ${host}`);
        return; // 公网 IPv6 字面量放行
    }
    const v4 = parseIPv4(host);
    if (v4) {
        if (isPrivateIPv4(v4)) throw new SsrfGuardError(`private ipv4: ${host}`);
        return; // 公网 IPv4 字面量放行
    }
    // 域名：DNS 解析增强
    await assertPublicResolvable(host);
}
