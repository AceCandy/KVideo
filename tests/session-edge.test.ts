import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSION_COOKIE_NAME,
  hasAuthConfiguredFromEnv,
  resolveSessionSecretFromEnv,
} from '../lib/auth/session-edge';

const ENV_KEYS = [
  'ADMIN_PASSWORD',
  'ACCESS_PASSWORD',
  'ACCOUNTS',
  'AUTH_SECRET',
  'PREMIUM_PASSWORD',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

test('SESSION_COOKIE_NAME 与 auth 模块一致', () => {
  assert.equal(SESSION_COOKIE_NAME, 'kvideo_session');
});

test('none 模式：未配置任何访问凭证 → hasAuth=false, secret=null', () => {
  assert.equal(hasAuthConfiguredFromEnv(), false);
  assert.equal(resolveSessionSecretFromEnv(), null);
});

test('legacy 模式：ACCESS_PASSWORD 配置 → hasAuth=true 并派生 legacy 密钥', () => {
  process.env.ACCESS_PASSWORD = 'pass-123';
  assert.equal(hasAuthConfiguredFromEnv(), true);
  assert.equal(resolveSessionSecretFromEnv(), 'legacy:pass-123::');
});

test('legacy 模式：ADMIN_PASSWORD 优先于 ACCESS_PASSWORD', () => {
  process.env.ADMIN_PASSWORD = 'admin-pw';
  process.env.ACCESS_PASSWORD = 'access-pw';
  assert.equal(resolveSessionSecretFromEnv(), 'legacy:admin-pw::');
});

test('legacy 模式：ACCOUNTS 与 PREMIUM_PASSWORD 进入派生串', () => {
  process.env.ADMIN_PASSWORD = 'pw';
  process.env.ACCOUNTS = 'u1:p1:n1';
  process.env.PREMIUM_PASSWORD = 'prem';
  assert.equal(resolveSessionSecretFromEnv(), 'legacy:pw:u1:p1:n1:prem');
});

test('managed 模式：AUTH_SECRET + UPSTASH 齐备 → hasAuth=true，返回 AUTH_SECRET', () => {
  process.env.AUTH_SECRET = 'managed-secret';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  assert.equal(hasAuthConfiguredFromEnv(), true);
  assert.equal(resolveSessionSecretFromEnv(), 'managed-secret');
});

test('AUTH_SECRET 存在但 UPSTASH 不全 → hasAuth=false（managed 前置不满足）', () => {
  process.env.AUTH_SECRET = 'orphan-secret';
  assert.equal(hasAuthConfiguredFromEnv(), false);
  // resolveSessionSecretFromEnv 只看 AUTH_SECRET 本身，与 hasAuth 判定维度不同；
  // middleware 在 hasAuth=false 时直接放行，不会调用此处
  assert.equal(resolveSessionSecretFromEnv(), 'orphan-secret');
});

test('仅设 PREMIUM_PASSWORD（内容隔离）→ hasAuth=false（不强制 session）', () => {
  process.env.PREMIUM_PASSWORD = 'prem-only';
  assert.equal(hasAuthConfiguredFromEnv(), false);
  assert.equal(resolveSessionSecretFromEnv(), null);
});
