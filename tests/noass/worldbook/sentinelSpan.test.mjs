import test from 'node:test';
import assert from 'node:assert/strict';

import { extractAndStripSentinelSpan } from '../../../modules/noass/runtime/worldbook/domain/sentinelSpan.js';

const BEGIN = '<<B>>';
const END = '<<E>>';

test('extractAndStripSentinelSpan 单消息内提取并剪除', () => {
  const messages = [{ role: 'system', content: `前${BEGIN}世界书${END}后` }];

  const result = extractAndStripSentinelSpan(messages, BEGIN, END);

  assert.equal(result.status, 'extracted');
  assert.equal(result.payload, '世界书');
  assert.equal(result.messages[0].content, '前后');
  assert.deepEqual(result.span, { beginIndex: 0, endIndex: 0 });
});

test('extractAndStripSentinelSpan 跨消息提取、移除中间消息并剪除首尾', () => {
  const messages = [
    { role: 'user', content: `a${BEGIN}wb1` },
    { role: 'user', content: 'wb2' },
    { role: 'user', content: `wb3${END} b` },
  ];

  const result = extractAndStripSentinelSpan(messages, BEGIN, END);

  assert.equal(result.status, 'extracted');
  assert.equal(result.payload, 'wb1\nwb2\nwb3');
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].content, 'a');
  assert.equal(result.messages[1].content, ' b');
  assert.deepEqual(result.span, { beginIndex: 0, endIndex: 2 });
});

test('extractAndStripSentinelSpan 未闭合时清除孤立 begin 并返回 unclosed', () => {
  const messages = [{ role: 'system', content: `前${BEGIN}世界书残段` }];

  const result = extractAndStripSentinelSpan(messages, BEGIN, END);

  assert.equal(result.status, 'unclosed');
  assert.equal(result.payload, '');
  assert.equal(result.messages[0].content, '前世界书残段');
  assert.equal(result.span.endIndex, -1);
});

test('extractAndStripSentinelSpan 无标记原样返回 not-found', () => {
  const messages = [{ role: 'user', content: '普通文本' }];

  const result = extractAndStripSentinelSpan(messages, BEGIN, END);

  assert.equal(result.status, 'not-found');
  assert.equal(result.payload, '');
  assert.equal(result.span, null);
  assert.equal(result.messages[0].content, '普通文本');
});

test('extractAndStripSentinelSpan 不修改输入数组与原消息对象', () => {
  const original = [
    { role: 'user', content: `a${BEGIN}wb` },
    { role: 'user', content: `${END}b` },
  ];
  const snapshot = JSON.parse(JSON.stringify(original));

  const result = extractAndStripSentinelSpan(original, BEGIN, END);

  assert.deepEqual(original, snapshot);
  assert.notEqual(result.messages, original);
});
