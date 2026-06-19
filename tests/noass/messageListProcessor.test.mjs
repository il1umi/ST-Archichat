import test from 'node:test';
import assert from 'node:assert/strict';

import { NO_TRANS_TAG } from '../../modules/noass/state/defaults.js';
import { processMessageList } from '../../modules/noass/runtime/messageListProcessor.js';

test('processMessageList flushes merge blocks before preserved no-trans and multimodal messages', () => {
  const template = { stored_data: {} };
  const config = { separator_system: '', clean_clewd: false };
  const multimodal = { role: 'user', content: [{ type: 'image_url', image_url: { url: 'x' } }] };
  const calls = [];
  const mergeBlock = (tpl, cfg, block, target) => {
    calls.push(block.map((message) => message.content));
    target.push({ role: 'assistant', content: `merged:${block.map((message) => message.content).join('|')}` });
    return block.some((message) => message.content === 'two');
  };

  const result = processMessageList(
    template,
    config,
    [
      { role: 'user', content: 'one' },
      { role: 'user', content: `${NO_TRANS_TAG} keep` },
      { role: 'assistant', content: 'two' },
      multimodal,
      { role: 'user', content: 'three' },
    ],
    mergeBlock,
  );

  assert.deepEqual(calls, [['one'], ['two'], ['three']]);
  assert.equal(result.storedChanged, true);
  assert.equal(result.finalMessages.length, 5);
  assert.deepEqual(result.finalMessages[0], { role: 'assistant', content: 'merged:one' });
  assert.deepEqual(result.finalMessages[1], { role: 'user', content: 'keep' });
  assert.deepEqual(result.finalMessages[2], { role: 'assistant', content: 'merged:two' });
  assert.deepEqual(result.finalMessages[3], multimodal);
  assert.deepEqual(result.finalMessages[4], { role: 'assistant', content: 'merged:three' });
});
