import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addPreservedMessage,
  processPreservedSystemMessage,
} from '../../modules/noass/runtime/preservedMessageProcessor.js';

test('processPreservedSystemMessage splits preserved system content at separator', () => {
  const target = [];
  const config = { separator_system: '<SYS_END>', clean_clewd: false };
  const template = { stored_data: {} };
  const message = { role: 'system', content: 'rules<SYS_END> keep me', name: 'sys-name' };

  processPreservedSystemMessage(config, template, message, target);

  assert.deepEqual(target, [
    { role: 'system', content: 'rules<SYS_END>' },
    { role: 'system', content: 'keep me', name: 'sys-name' },
  ]);
});

test('addPreservedMessage ignores empty content and preserves non-string content by reference', () => {
  const target = [];
  const config = { separator_system: '', clean_clewd: false };
  const template = { stored_data: {} };
  const multimodal = { role: 'user', content: [{ type: 'image_url', image_url: { url: 'x' } }] };

  addPreservedMessage(config, template, { role: 'user', content: '' }, target);
  addPreservedMessage(config, template, multimodal, target);

  assert.deepEqual(target, [multimodal]);
});
