import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { fetchWithRetry } from '../lib/utils/fetch-with-retry';

// 捕获传给上游 fetch 的请求头，断言身份冒充头不再被写入。
let capturedHeaders: Record<string, string> | null = null;
const originalFetch = globalThis.fetch;

before(() => {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedHeaders = (init?.headers as Record<string, string>) || {};
    return new Response('ok', { status: 200 });
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

test('fetchWithRetry：出站请求不含身份冒充头 X-Forwarded-For / Client-IP / Origin', async () => {
  capturedHeaders = null;
  const request = new NextRequest('https://kvideo.test/api/proxy?url=https://example.com/v.m3u8');
  await fetchWithRetry({ url: 'https://example.com/v.m3u8', request });
  assert.ok(capturedHeaders, 'fetch 应被调用');
  assert.equal(capturedHeaders!['X-Forwarded-For'], undefined);
  assert.equal(capturedHeaders!['Client-IP'], undefined);
  assert.equal(capturedHeaders!['Origin'], undefined);
});

test('fetchWithRetry：?ip= / ?referer= 查询参数无法注入出站头', async () => {
  capturedHeaders = null;
  // 试图借 query 注入伪造身份与 Referer —— 必须被忽略
  const request = new NextRequest(
    'https://kvideo.test/api/proxy?url=https://example.com/v.m3u8&ip=9.9.9.9&referer=https://evil.test/'
  );
  await fetchWithRetry({ url: 'https://example.com/v.m3u8', request });
  assert.equal(capturedHeaders!['X-Forwarded-For'], undefined);
  assert.equal(capturedHeaders!['Client-IP'], undefined);
  // Referer 固定为上游域（hostname，无尾斜杠），不受 ?referer= 影响
  assert.equal(capturedHeaders!['Referer'], 'https://example.com');
});

test('fetchWithRetry：仍转发功能性 Range 头', async () => {
  capturedHeaders = null;
  const request = new NextRequest('https://kvideo.test/api/proxy?url=https://example.com/v.m3u8');
  await fetchWithRetry({
    url: 'https://example.com/v.m3u8',
    request,
    headers: { range: 'bytes=0-1023' },
  });
  assert.equal(capturedHeaders!['range'], 'bytes=0-1023');
});
