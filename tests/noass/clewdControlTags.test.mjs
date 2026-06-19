import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanupClewdControlTags } from '../../modules/noass/runtime/clewd/controlTags.js';

test('cleanupClewdControlTags preserves current clewd control tag normalization', () => {
  const input = 'Human: hello<|space|>world<|join|>!<|curtail|>next\r\n<|unknown|>tail<|\\n|>end';

  assert.equal(
    cleanupClewdControlTags(input),
    '\n\nHuman: hello world!\nnext\n\ntail\nend',
  );
});
