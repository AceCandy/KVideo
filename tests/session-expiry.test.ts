import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  signSessionPayload,
  verifySessionToken,
  SESSION_MAX_AGE_SECONDS,
  type SessionPayload,
} from '../lib/server/auth-helpers';

const SECRET = 'test-session-secret';
const DAY_MS = 24 * 60 * 60 * 1000;

function buildPayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    accountId: 'acc-1',
    profileId: 'prof-1',
    name: 'tester',
    role: 'admin',
    mode: 'legacy',
    iat: Date.now(),
    ...overrides,
  };
}

test('verifySessionToken 放行新签发的 token', async () => {
  const token = await signSessionPayload(buildPayload(), SECRET);
  const payload = await verifySessionToken(token, SECRET);
  assert.ok(payload, 'fresh token should verify');
  assert.equal(payload?.accountId, 'acc-1');
  assert.equal(payload?.role, 'admin');
});

test('verifySessionToken 拒绝超过 SESSION_MAX_AGE 的过期 token', async () => {
  const stale = buildPayload({ iat: Date.now() - (SESSION_MAX_AGE_SECONDS * 1000 + DAY_MS) });
  const token = await signSessionPayload(stale, SECRET);
  assert.equal(await verifySessionToken(token, SECRET), null);
});

test('verifySessionToken 拒绝错误密钥签发的 token', async () => {
  const token = await signSessionPayload(buildPayload(), SECRET);
  assert.equal(await verifySessionToken(token, 'wrong-secret'), null);
});

test('verifySessionToken 拒绝格式损坏的 token', async () => {
  assert.equal(await verifySessionToken('not-a-valid-token', SECRET), null);
  assert.equal(await verifySessionToken('a.b.c.d', SECRET), null);
});
