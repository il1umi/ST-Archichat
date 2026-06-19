import test from 'node:test';
import assert from 'node:assert/strict';

import { rewriteSystemPrefixes } from '../../modules/noass/runtime/clewd/systemRewrite.js';

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

test('rewriteSystemPrefixes preserves current system prefix rewrite semantics', () => {
  assert.equal(
    rewriteSystemPrefixes('\n\nSYSTEM: rules', prefixs, enabled),
    '\n\nrules',
  );

  assert.equal(
    rewriteSystemPrefixes('\n\nHuman: hi\n\nSYSTEM: rules', prefixs, enabled),
    '\n\nHuman: hi\n\nHuman: rules',
  );

  assert.equal(
    rewriteSystemPrefixes('\n\nHuman: <|Merge Human Disable|>\n\nSYSTEM: rules', prefixs, {
      ...enabled,
      user: true,
    }),
    '\n\nHuman: <|Merge Human Disable|>\n\nrules',
  );
});
