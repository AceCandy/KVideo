import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signPremiumToken, verifyPremiumToken } from '../lib/server/auth-helpers';

const SECRET = 'test-premium-secret';

test('signPremiumToken：生成 random.signature 两段格式', async () => {
  const token = await signPremiumToken(SECRET);
  const parts = token.split('.');
  assert.equal(parts.length, 2);
  assert.ok(parts[0].length > 0);
  assert.ok(parts[1].length > 0);
});

test('verifyPremiumToken：合法 token 通过', async () => {
  const token = await signPremiumToken(SECRET);
  assert.equal(await verifyPremiumToken(token, SECRET), true);
});

test('verifyPremiumToken：篡改 signature 失败', async () => {
  const token = await signPremiumToken(SECRET);
  const [random] = token.split('.');
  assert.equal(await verifyPremiumToken(`${random}.invalid-sig`, SECRET), false);
});

test('verifyPremiumToken：不同 secret 验证失败', async () => {
  const token = await signPremiumToken(SECRET);
  assert.equal(await verifyPremiumToken(token, 'other-secret'), false);
});

test('verifyPremiumToken：空值与格式错均失败', async () => {
  assert.equal(await verifyPremiumToken(undefined, SECRET), false);
  assert.equal(await verifyPremiumToken('', SECRET), false);
  assert.equal(await verifyPremiumToken('onlyonepart', SECRET), false);
});

test('signPremiumToken：每次随机段不同且均能验过', async () => {
  const a = await signPremiumToken(SECRET);
  const b = await signPremiumToken(SECRET);
  assert.notEqual(a, b);
  assert.equal(await verifyPremiumToken(a, SECRET), true);
  assert.equal(await verifyPremiumToken(b, SECRET), true);
});
