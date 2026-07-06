import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interleaveResults } from '../lib/utils/recommendation-engine';

function mk(id: string, title: string) {
    return { id, title, cover: 'c', rate: '0', url: 'u' };
}

test('interleaveResults：同 id 不同 title 仅保留一条（对齐 React key）', () => {
    const results = [
        { label: 'A', movies: [mk('3314870', '霸王别姬')] },
        { label: 'B', movies: [mk('3314870', '霸王别姬 ')] }, // 尾部空格 → titleKey 不同
    ];
    const out = interleaveResults(results, new Set());
    assert.equal(out.length, 1);
    assert.equal(out[0].id, '3314870');
});

test('interleaveResults：不同 id 正常交织保留', () => {
    const results = [
        { label: 'A', movies: [mk('1', '甲')] },
        { label: 'B', movies: [mk('2', '乙')] },
    ];
    const out = interleaveResults(results, new Set());
    assert.equal(out.length, 2);
});

test('interleaveResults：watched title 仍按 title 过滤（大小写不敏感）', () => {
    const results = [
        { label: 'A', movies: [mk('1', '片X')] },
    ];
    const out = interleaveResults(results, new Set(['片x']));
    assert.equal(out.length, 0);
});
