import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMergeDisableFlags } from '../../modules/noass/runtime/clewd/mergeDisable.js';

test('parseMergeDisableFlags preserves exact merge-disable flag semantics', () => {
  assert.deepEqual(parseMergeDisableFlags('<|Merge Disable|>'), {
    all: true,
    system: false,
    user: false,
    assistant: false,
  });

  assert.deepEqual(
    parseMergeDisableFlags('<|Merge System Disable|><|Merge Human Disable|><|Merge Assistant Disable|>'),
    {
      all: false,
      system: true,
      user: true,
      assistant: true,
    },
  );

  assert.deepEqual(parseMergeDisableFlags(''), {
    all: false,
    system: false,
    user: false,
    assistant: false,
  });
});
