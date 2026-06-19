import test from 'node:test';
import assert from 'node:assert/strict';

import { relocateAtBlocks } from '../../modules/noass/runtime/clewd/atRelocation.js';

const prefixs = {
  user: 'Human',
  assistant: 'Assistant',
};

test('relocateAtBlocks moves at-block content to the previous turn segment', () => {
  assert.equal(
    relocateAtBlocks('\n\nHuman: one\n\nAssistant: two <@1>moved</@1>', prefixs),
    '\n\nHuman: one\n\nmoved\n\nAssistant: two ',
  );
});
