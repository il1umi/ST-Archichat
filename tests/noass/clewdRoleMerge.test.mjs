import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeAdjacentRolePrefixes } from '../../modules/noass/runtime/clewd/roleMerge.js';

const prefixs = {
  user: 'Human',
  assistant: 'Assistant',
  system: 'SYSTEM',
};

const enabled = {
  all: false,
  system: false,
  user: false,
  assistant: false,
};

test('mergeAdjacentRolePrefixes preserves current adjacent role merge semantics', () => {
  assert.equal(
    mergeAdjacentRolePrefixes('\n\nHuman: one\n\nHuman: two', prefixs, enabled),
    '\n\nHuman: one\n\ntwo',
  );

  assert.equal(
    mergeAdjacentRolePrefixes('\n\nHuman: one\n\nHuman: two', prefixs, {
      ...enabled,
      user: true,
    }),
    '\n\nHuman: one\n\nHuman: two',
  );
});
