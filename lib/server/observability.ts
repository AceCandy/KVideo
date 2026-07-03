/**
 * 可观测性：结构化错误日志 + 可选 Sentry/GlitchTip 上报 + 审计日志。
 * @author AceCandy
 *
 * - 无 DSN 时仅输出结构化 console 日志（生产环境 error/warn 由 next.config 保留）。
 * - 配置 SENTRY_DSN / GLITCHTIP_DSN 时，reportError 额外 POST Sentry 兼容 envelope。
 * - 审计日志（logAudit）用 console.warn，标记 audit:true 便于日志聚合过滤。
 */

interface ParsedDsn {
  /** envelope ingest endpoint，含 projectId */
  url: string;
  publicKey: string;
}

/** 解析 Sentry/GlitchTip DSN 为 ingest endpoint + public key；非法返回 null */
export function parseSentryDsn(dsn: string): ParsedDsn | null {
  try {
    const parsed = new URL(dsn);
    const publicKey = parsed.username;
    const projectId = parsed.pathname.replace(/^\//, '');
    if (!publicKey || !projectId) return null;
    return {
      url: `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`,
      publicKey,
    };
  } catch {
    return null;
  }
}

/** 脱敏 URL：去除 query 与 fragment，避免 token 进入日志；解析失败则截断 */
export function sanitizeUrlForLog(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return rawUrl.slice(0, 120);
  }
}

/**
 * 上报错误：始终输出结构化 console.error；配置 DSN 时额外 POST Sentry/GlitchTip envelope。
 * 上报失败静默，不影响主流程。
 */
export async function reportError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const timestamp = new Date().toISOString();
  console.error(
    JSON.stringify({ level: 'error', msg: err.message, stack: err.stack, ts: timestamp, ...context })
  );

  const dsn = process.env.SENTRY_DSN || process.env.GLITCHTIP_DSN;
  const parsed = dsn ? parseSentryDsn(dsn) : null;
  if (!parsed) return;

  const eventId = crypto.randomUUID();
  const event = {
    event_id: eventId,
    timestamp,
    platform: 'node',
    level: 'error',
    message: err.message,
    exception: { values: [{ type: err.name, value: err.message }] },
    extra: context,
    sdk: { name: 'kvideo', version: '1.0.0' },
  };
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: timestamp }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');

  try {
    await fetch(parsed.url, {
      method: 'POST',
      body: envelope,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'X-Sentry-Auth': `Sentry sentry_key=${parsed.publicKey}, sentry_client=kvideo/1.0.0, sentry_version=7`,
      },
    });
  } catch {
    // 上报失败静默
  }
}

/**
 * 结构化审计日志。用 console.warn（生产保留），audit:true 标记便于聚合过滤。
 * details 不得包含明文密码 / token / 完整带参 URL。
 */
export function logAudit(event: string, details?: Record<string, unknown>): void {
  console.warn(JSON.stringify({ audit: true, event, ts: new Date().toISOString(), ...details }));
}
