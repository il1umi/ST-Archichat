import test from 'node:test';
import assert from 'node:assert/strict';

import { processAndAddMergeBlock } from '../../modules/noass/runtime/mergeBlockProcessor.js';

test('processAndAddMergeBlock merges a simple text block into the target array', () => {
  const template = { stored_data: {}, clewd_tag_transfer_rules: [], debug_worldbook: false };
  const config = {
    user: 'Human',
    assistant: 'Assistant',
    system: 'SYSTEM',
    separator: '',
    separator_system: '',
    capture_enabled: false,
    capture_rules: [],
    worldbook: { groups: [], snapshot: {} },
    prefill_user: '',
    inject_prefill: false,
    single_user: false,
    clean_clewd: false,
  };
  const target = [];

  const changed = processAndAddMergeBlock(
    template,
    config,
    [{ role: 'user', content: 'hello' }],
    target,
  );

  assert.equal(changed, false);
  assert.deepEqual(target, [{ role: 'assistant', content: 'Human: hello' }]);
});
