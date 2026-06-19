import test from 'node:test';
import assert from 'node:assert/strict';

import { placeAtCustomAnchor } from '../../../modules/noass/runtime/worldbook/domain/customAnchorPlacement.js';

test('placeAtCustomAnchor 在命中标记的消息处注入 payload', () => {
  const messages = [
    { role: 'system', content: '开场' },
    { role: 'user', content: '请在此处[[WB]]继续' },
  ];

  const result = placeAtCustomAnchor(messages, '世界书内容', '[[WB]]');

  assert.equal(result.status, 'placed');
  assert.equal(result.messageIndex, 1);
  assert.equal(result.messages[1].content, '请在此处世界书内容继续');
});

test('placeAtCustomAnchor 多条消息含标记时只替换首个命中', () => {
  const messages = [
    { role: 'user', content: '前[[WB]]后' },
    { role: 'user', content: '又一个[[WB]]' },
  ];

  const result = placeAtCustomAnchor(messages, 'X', '[[WB]]');

  assert.equal(result.status, 'placed');
  assert.equal(result.messageIndex, 0);
  assert.equal(result.messages[0].content, '前X后');
  assert.equal(result.messages[1].content, '又一个[[WB]]');
});

test('placeAtCustomAnchor 标记不存在时返回 anchor-missing 并保持内容', () => {
  const messages = [{ role: 'user', content: '没有标记' }];

  const result = placeAtCustomAnchor(messages, 'X', '[[WB]]');

  assert.equal(result.status, 'anchor-missing');
  assert.equal(result.messageIndex, -1);
  assert.equal(result.messages[0].content, '没有标记');
});

test('placeAtCustomAnchor 空 payload 返回 empty-payload', () => {
  const messages = [{ role: 'user', content: '[[WB]]' }];

  const result = placeAtCustomAnchor(messages, '   ', '[[WB]]');

  assert.equal(result.status, 'empty-payload');
  assert.equal(result.messageIndex, -1);
});

test('placeAtCustomAnchor 空标记返回 empty-anchor', () => {
  const messages = [{ role: 'user', content: '内容' }];

  const result = placeAtCustomAnchor(messages, 'X', '   ');

  assert.equal(result.status, 'empty-anchor');
  assert.equal(result.messageIndex, -1);
});

test('placeAtCustomAnchor 不修改输入数组与原消息对象', () => {
  const original = [{ role: 'user', content: '前[[WB]]后' }];
  const snapshot = JSON.parse(JSON.stringify(original));

  const result = placeAtCustomAnchor(original, 'X', '[[WB]]');

  assert.deepEqual(original, snapshot);
  assert.notEqual(result.messages, original);
  assert.notEqual(result.messages[0], original[0]);
});
