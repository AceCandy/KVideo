import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    isAllowedProtocol,
    isBlockedHostname,
    parseIPv4,
    isPrivateIPv4,
    isPrivateIPv6,
    assertSafeOutboundUrl,
    SsrfGuardError,
} from '../lib/server/url-guard';

test('isAllowedProtocol 仅放行 http/https', () => {
    assert.equal(isAllowedProtocol('http:'), true);
    assert.equal(isAllowedProtocol('https:'), true);
    assert.equal(isAllowedProtocol('file:'), false);
    assert.equal(isAllowedProtocol('ftp:'), false);
    assert.equal(isAllowedProtocol('gopher:'), false);
});

test('isBlockedHostname 命中内网别名与元数据主机', () => {
    assert.equal(isBlockedHostname('localhost'), true);
    assert.equal(isBlockedHostname('foo.local'), true);
    assert.equal(isBlockedHostname('a.b.internal'), true);
    assert.equal(isBlockedHostname('metadata.google.internal'), true);
    assert.equal(isBlockedHostname(''), true);
    assert.equal(isBlockedHostname('example.com'), false);
    assert.equal(isBlockedHostname('img3.doubanio.com'), false);
});

test('parseIPv4 合法与非法', () => {
    assert.deepEqual(parseIPv4('192.168.1.1'), [192, 168, 1, 1]);
    assert.deepEqual(parseIPv4('8.8.8.8'), [8, 8, 8, 8]);
    assert.equal(parseIPv4('999.1.1.1'), null);
    assert.equal(parseIPv4('1.2.3'), null);
    assert.equal(parseIPv4('012.1.1.1'), null); // 八进制歧义
    assert.equal(parseIPv4('a.b.c.d'), null);
});

test('isPrivateIPv4 命中私有段', () => {
    const privateIps = ['10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.168.0.1', '0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255'];
    for (const ip of privateIps) {
        const v = parseIPv4(ip)!;
        assert.equal(isPrivateIPv4(v), true, `${ip} 应为私有`);
    }
    const publicIps = ['8.8.8.8', '1.1.1.1', '172.32.0.1', '11.0.0.1', '100.63.0.1', '100.128.0.1'];
    for (const ip of publicIps) {
        const v = parseIPv4(ip)!;
        assert.equal(isPrivateIPv4(v), false, `${ip} 应为公网`);
    }
});

test('isPrivateIPv6 命中私有段', () => {
    assert.equal(isPrivateIPv6('::1'), true);
    assert.equal(isPrivateIPv6('::'), true);
    assert.equal(isPrivateIPv6('fe80::1'), true);
    assert.equal(isPrivateIPv6('fc00::1'), true);
    assert.equal(isPrivateIPv6('fd00::1'), true);
    assert.equal(isPrivateIPv6('ff02::1'), true);
    assert.equal(isPrivateIPv6('::ffff:127.0.0.1'), true);
    assert.equal(isPrivateIPv6('2001:4860:4860::8888'), false); // Google DNS 公网
});

test('assertSafeOutboundUrl 拦截内网与非法协议', async () => {
    await assert.rejects(() => assertSafeOutboundUrl('http://127.0.0.1/'), SsrfGuardError);
    await assert.rejects(() => assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data/'), SsrfGuardError);
    await assert.rejects(() => assertSafeOutboundUrl('http://10.0.0.1/'), SsrfGuardError);
    await assert.rejects(() => assertSafeOutboundUrl('http://192.168.1.1/'), SsrfGuardError);
    await assert.rejects(() => assertSafeOutboundUrl('http://[::1]/'), SsrfGuardError);
    await assert.rejects(() => assertSafeOutboundUrl('file:///etc/passwd'), SsrfGuardError);
    await assert.rejects(() => assertSafeOutboundUrl('http://localhost/'), SsrfGuardError);
    await assert.rejects(() => assertSafeOutboundUrl('http://foo.local/'), SsrfGuardError);
});

test('assertSafeOutboundUrl 放行公网 IP 字面量', async () => {
    await assertSafeOutboundUrl('http://8.8.8.8/dns');
    await assertSafeOutboundUrl('https://1.1.1.1/');
});
