/**
 * 出站 TLS 策略：默认严格校验证书，仅对显式配置的源域名按请求豁免。
 * @author AceCandy
 *
 * - 进程级 NODE_TLS_REJECT_UNAUTHORIZED='0' 会全局关闭校验（中间人风险），已弃用。
 * - 改为按域名豁免：配置 INSECURE_TLS_DOMAINS=a.com,b.com 后，仅这些域名（含子域）
 *   在 Node runtime 下通过 undici Agent 关闭证书校验，其余域名严格校验。
 * - Edge runtime 不支持自定义 TLS agent，豁免在 Edge 无效（见 docs/tls-policy.md）。
 */

let cachedInsecureDispatcher: unknown = null;
let insecureDispatcherInitialized = false;

/** 解析 INSECURE_TLS_DOMAINS 为去空、小写的域名列表 */
export function getInsecureTlsDomains(): string[] {
  const raw = process.env.INSECURE_TLS_DOMAINS || '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** 判断 host 是否命中豁免列表（精确匹配或为列表域名的子域） */
export function isInsecureTlsDomain(host: string): boolean {
  const h = host.toLowerCase();
  if (!h) return false;
  return getInsecureTlsDomains().some(
    (domain) => h === domain || h.endsWith(`.${domain}`)
  );
}

/**
 * 获取豁免用的 undici dispatcher（单例缓存）。
 * Node runtime 可用；Edge 或 undici 不可用时返回 null（豁免降级为不生效）。
 */
export async function getInsecureDispatcher(): Promise<unknown> {
  if (insecureDispatcherInitialized) return cachedInsecureDispatcher;
  insecureDispatcherInitialized = true;
  try {
    const mod = await import('undici');
    cachedInsecureDispatcher = new mod.Agent({
      connect: { rejectUnauthorized: false },
    });
  } catch {
    cachedInsecureDispatcher = null;
  }
  return cachedInsecureDispatcher;
}

/** 若 URL 命中豁免域名，返回 insecure dispatcher；否则返回 undefined（用默认校验） */
export async function dispatcherForUrl(url: string): Promise<unknown> {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return undefined;
  }
  if (!isInsecureTlsDomain(host)) return undefined;
  return getInsecureDispatcher();
}
