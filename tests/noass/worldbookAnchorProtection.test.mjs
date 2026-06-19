import test from 'node:test';
import assert from 'node:assert/strict';

import { WORLD_BOOK_SENTINEL_PREFIX } from '../../modules/noass/runtime/clewd/constants.js';
import { createCustomAnchorProtection } from '../../modules/noass/runtime/worldbookAnchorProtection.js';

test('createCustomAnchorProtection masks unique custom anchors and restores merged content', () => {
  const config = {
    worldbook: {
      groups: [
        { target: { anchor: 'custom', customKey: '<ANCHOR_A>' } },
        { target: { anchor: 'custom', customKey: ' <ANCHOR_B> ' } },
        { target: { anchor: 'custom', customKey: '<ANCHOR_A>' } },
        { target: { anchor: 'before', customKey: '<IGNORED>' } },
      ],
    },
  };
  const originalMessage = { role: 'user', content: 'x <ANCHOR_A> y <ANCHOR_B>' };
  const block = [originalMessage, { role: 'assistant', content: 'plain' }, null];

  const protection = createCustomAnchorProtection(config, block);

  assert.notEqual(protection.blockForProcess, block);
  assert.notEqual(protection.blockForProcess[0], originalMessage);
  assert.equal(
    protection.blockForProcess[0].content,
    `x ${WORLD_BOOK_SENTINEL_PREFIX}ANCHOR0__ y ${WORLD_BOOK_SENTINEL_PREFIX}ANCHOR1__`,
  );
  assert.equal(originalMessage.content, 'x <ANCHOR_A> y <ANCHOR_B>');
  assert.equal(
    protection.restoreContent(
      `${WORLD_BOOK_SENTINEL_PREFIX}ANCHOR1__ then ${WORLD_BOOK_SENTINEL_PREFIX}ANCHOR0__`,
    ),
    '<ANCHOR_B> then <ANCHOR_A>',
  );
});

test('createCustomAnchorProtection leaves blocks untouched without custom anchors', () => {
  const block = [{ role: 'user', content: 'plain' }];
  const protection = createCustomAnchorProtection({ worldbook: { groups: [] } }, block);

  assert.equal(protection.blockForProcess, block);
  assert.equal(protection.restoreContent('plain'), 'plain');
});
