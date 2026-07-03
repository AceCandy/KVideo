import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getInsecureTlsDomains,
  isInsecureTlsDomain,
} from '../lib/server/tls-policy';

const ENV_KEY = 'INSECURE_TLS_DOMAINS';
let original: string | undefined;

beforeEach(() => {
  original = process.env[ENV_KEY];
  delete process.env[ENV_KEY];
});

afterEach(() => {
  if (original === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = original;
});

test('getInsecureTlsDomains：逗号分隔、去空、小写', () => {
  process.env[ENV_KEY] = ' Foo.com , bar.org, , Baz.NET ';
  assert.deepEqual(getInsecureTlsDomains(), ['foo.com', 'bar.org', 'baz.net']);
});

test('getInsecureTlsDomains：未配置返回空数组', () => {
  assert.deepEqual(getInsecureTlsDomains(), []);
});

test('isInsecureTlsDomain：精确匹配与子域匹配', () => {
  process.env[ENV_KEY] = 'src.example.com,bad.io';
  assert.equal(isInsecureTlsDomain('src.example.com'), true);
  assert.equal(isInsecureTlsDomain('cdn.src.example.com'), true);
  assert.equal(isInsecureTlsDomain('bad.io'), true);
});

test('isInsecureTlsDomain：拒绝前缀伪匹配与不相关域名', () => {
  process.env[ENV_KEY] = 'bad.io';
  assert.equal(isInsecureTlsDomain('notbad.io'), false);
  assert.equal(isInsecureTlsDomain('other.com'), false);
  assert.equal(isInsecureTlsDomain(''), false);
});
