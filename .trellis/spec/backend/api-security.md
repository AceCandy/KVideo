# API Security Guidelines

> Conventions for outbound-fetching and sensitive API routes. Distilled from `security-batch1`.

---

## Why this exists

KVideo lets deployers plug in user-controlled video sources, IPTV playlists, and douban image URLs. Every outbound fetch goes to a URL the caller can influence, so the API layer must assume untrusted upstreams. These rules prevent credential leaks, identity spoofing, and resource exhaustion via amplification.

---

## Rules

### 1. Never forward session credentials to upstreams

Outbound proxies must not forward `cookie`. Forward only functional headers (e.g. `range` for partial content).

- **Where**: `app/api/proxy/route.ts` `forwardHeaders` allowlist.
- **Why**: the upstream URL is user-controlled. Forwarding `kvideo_session` lets any malicious source or playlist harvest the caller's 30-day session cookie.
- **Do**: `forwardHeaders = ['range']`.
- **Don't**: include `'cookie'`, or forward `request.headers` wholesale.

### 2. Reject client-injected outbound request headers

Do not read query params (`?ip=`, `?referer=`) and write them into outbound headers. Identity headers (`X-Forwarded-For`, `Client-IP`, `Origin`) must not be fabricated.

- **Where**: `lib/utils/fetch-with-retry.ts`.
- **Why**: query-injected XFF/Client-IP lets a client impersonate any source IP to the upstream; a fabricated `Origin` is identity spoofing.
- **Do**: keep anti-blocking headers (`User-Agent`, `Accept-Language`, `Referer` fixed to the upstream host); drop `X-Forwarded-For` / `Client-IP` / `Origin`.
- **Regression test**: `tests/fetch-with-retry.test.ts` locks this.

### 3. Rate-limit outbound-amplifying and sensitive-write endpoints

Any endpoint that fans out into multiple outbound fetches, or mutates auth/account state, must call `rateLimit` (IP-scoped) before its outbound fan-out. The default position is the handler entry, before parameter validation — **except** when the endpoint serves an application-layer cache: then look up the cache first and rate-limit only the miss branch, so cache hits do not consume quota (see "Cache-first rate limiting" below).

- **Where**: `detail`, `probe-resolution`, `iptv/stream`, `douban/image`, `douban/recommend`, `auth/accounts` (including `[accountId]`), `user/sync`.
- **Pattern**:
  ```ts
  const ip = getClientIp(request);
  const rl = await rateLimit(`${scope}:${ip}`, { limit, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  ```
- **Quota tiers** (initial values, tune on regression): amplifiers `detail`/`iptv-stream`/`douban-image` 60–120/60s; `probe-resolution` and account writes 10/60s (highest blast radius per request); `douban-rec` 200/60s (looser, because `douban/recommend` serves an application-layer cache — see below).
- **Why**: `probe-resolution` can trigger hundreds of subrequests per request; unbounded endpoints bypass the rate limiting that `proxy` and `search` already enforce.
- **Cache-first rate limiting**: when an endpoint caches its upstream response in application-layer storage (`douban/recommend` via `lib/server/douban-cache.ts`), rate-limit only the cache-miss branch. A cache hit returns directly and must **not** call `rateLimit`, so legitimate repeated refreshes are not penalized for responses that never reach the upstream.
  - **Pattern**:
    ```ts
    const cacheKey = buildCacheKey(params);
    const cached = await getCached(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached)); // no rateLimit on hit
    const rl = await rateLimit(`${scope}:${ip}`, { limit, windowSec: 60 });
    if (!rl.success) return /* 429 */;
    // ... fetch upstream, transform, await setCached(cacheKey, body)
    ```
  - The cache key namespace must differ from the rate-limit key (e.g. `douban-rec:cache:` vs `ratelimit:`) so counters and entries never collide.
  - The limiter degrades gracefully: with no Redis configured, the cache layer is a no-op and the endpoint falls back to entry-position limiting at the same quota, never erroring.
  - **Why**: with the entry-position limiter, `douban/recommend` returned 429 after ~5 refreshes because a single home page load fires up to 6 parallel recommend requests (`usePopularMovies` + up to 5 `usePersonalizedRecommendations`), and hits to Next's fetch cache still incremented the counter (the limiter ran before the cached fetch resolved).

### 4. Cap fan-out inputs before streaming

Endpoints that accept arrays of upstreams (`search-parallel` `sources`, `probe-resolution` `videos`) must cap the array length and reject with 400 **before** opening an SSE stream — otherwise edge-runtime subrequest quota is spent before the limit triggers.

- **Where**: `app/api/search-parallel/route.ts` `MAX_SOURCES`.
- **Pattern**: pre-parse the body at the POST top (not inside `ReadableStream.start`) so an oversized payload returns 400 without creating the stream.

### 5. Error responses must not leak internals

5xx and unhandled-path responses must return a fixed message. Upstream URL, `error.message`, and stack details go to server logs only (`reportError` + `sanitizeUrlForLog`).

- **Where**: `app/api/proxy/route.ts` catch block.
- **Why**: CORS is `*`, so any site can read these responses; internal URLs, params, and error text are information disclosure.

---

## Validation

- `tests/fetch-with-retry.test.ts` asserts rules 1–2 at the fetch boundary.
- `tests/rate-limit.test.ts` covers the limiter mechanism; endpoint wiring is verified by code review and manual regression.
- `npx tsc --noEmit` and `npm test` must stay green.
