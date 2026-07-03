import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSentryDsn,
  sanitizeUrlForLog,
  reportError,
  logAudit,
} from '../lib/server/observability';

// 确保无 DSN，验证降级路径
before(() => {
  delete process.env.SENTRY_DSN;
  delete process.env.GLITCHTIP_DSN;
});

test('parseSentryDsn：合法 DSN 解析出 envelope URL 与 publicKey', () => {
  const parsed = parseSentryDsn('https://abc123@glitchtip.example.com/42');
  assert.ok(parsed);
  assert.equal(parsed?.publicKey, 'abc123');
  assert.equal(parsed?.url, 'https://glitchtip.example.com/api/42/envelope/');
});

test('parseSentryDsn：非法输入返回 null', () => {
  assert.equal(parseSentryDsn('not-a-dsn'), null);
  assert.equal(parseSentryDsn('https://host/1'), null); // 缺 publicKey
  assert.equal(parseSentryDsn('https://user@host/'), null); // 缺 projectId
});

test('sanitizeUrlForLog：去除 query 与 fragment', () => {
  assert.equal(
    sanitizeUrlForLog('https://src.example.com/path?token=secret#frag'),
    'https://src.example.com/path'
  );
});

test('sanitizeUrlForLog：非法 URL 截断', () => {
  const input = 'not-a-url';
  assert.equal(sanitizeUrlForLog(input), 'not-a-url');
});

test('reportError：无 DSN 时不抛错（仅结构化日志）', async () => {
  await reportError(new Error('boom'), { route: '/api/proxy' });
  // 无断言失败即通过；结构化日志已写入 stderr
});

test('logAudit：输出含 audit 标记', () => {
  // 捕获 console.warn 输出
  const original = console.warn;
  let captured = '';
  console.warn = (msg: string) => {
    captured = msg;
  };
  try {
    logAudit('login_failed', { ip: '1.2.3.4' });
  } finally {
    console.warn = original;
  }
  const parsed = JSON.parse(captured);
  assert.equal(parsed.audit, true);
  assert.equal(parsed.event, 'login_failed');
  assert.equal(parsed.ip, '1.2.3.4');
  assert.ok(parsed.ts);
});
