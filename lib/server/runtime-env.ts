/**
 * Read an environment value that may live in either runtime environment.
 *
 * On Cloudflare, bindings and secrets are only reachable through the
 * per-request context. On Docker / Node self-hosting there is no such context,
 * so the value comes from `process.env`.
 */
export function getRuntimeEnvValue(name: string, fallback = ''): string {
  const contextSymbol = Symbol.for('__cloudflare-request-context__');
  const context = (globalThis as typeof globalThis & {
    [contextSymbol]?: { env?: Record<string, unknown> };
  })[contextSymbol];
  const value = context?.env?.[name];
  if (typeof value === 'string') return value;

  return typeof process !== 'undefined' ? process.env[name] || fallback : fallback;
}
