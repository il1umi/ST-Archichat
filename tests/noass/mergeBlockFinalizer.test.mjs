import test from 'node:test';
import assert from 'node:assert/strict';

import { finalizeMergedBlock } from '../../modules/noass/runtime/mergeBlockFinalizer.js';

test('finalizeMergedBlock preserves system split, dispatch order, prefill, and assigned role', () => {
  const template = { stored_data: {}, clewd_tag_transfer_rules: [] };
  const config = {
    separator_system: '<SYS_END>',
    prefill_user: 'prefill text',
    inject_prefill: true,
    __prefillInjected: false,
    single_user: true,
    clean_clewd: false,
  };
  const merged = { role: 'assistant', content: 'system rules<SYS_END>merged body' };
  const dispatch = {
    before: [{ role: 'system', content: 'before worldbook' }],
    after: [{ role: 'system', content: 'after worldbook' }],
  };
  const target = [];

  finalizeMergedBlock(template, config, merged, dispatch, target);

  assert.deepEqual(target, [
    { role: 'system', content: 'system rules<SYS_END>' },
    { role: 'system', content: 'before worldbook' },
    { role: 'user', content: 'prefill text' },
    { role: 'user', content: 'merged body' },
    { role: 'system', content: 'after worldbook' },
  ]);
  assert.equal(config.__prefillInjected, true);
});
