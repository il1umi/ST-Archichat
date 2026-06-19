import test from 'node:test';
import assert from 'node:assert/strict';

import { createClewdProcessOptions } from '../../modules/noass/runtime/clewdProcessOptions.js';

test('createClewdProcessOptions translates hyperRegex match events into worldbook logs', () => {
  const appended = [];
  const logAdapter = {
    append: (label, info) => appended.push({ label, info }),
  };

  const options = createClewdProcessOptions({ debug_worldbook: true }, logAdapter);

  assert.equal(typeof options.logHandler, 'function');
  options.logHandler('ignored:event', { order: 1, match: 'abc' });
  options.logHandler('hyperRegex:match', { order: 2, match: 'x'.repeat(200) });

  assert.equal(appended.length, 1);
  assert.equal(appended[0].label, 'clewd 正则命中');
  assert.deepEqual(Object.keys(appended[0].info), ['order', 'preview']);
  assert.equal(appended[0].info.order, 2);
  assert.equal(appended[0].info.preview.length, 161);
});

test('createClewdProcessOptions returns undefined when debug logging is disabled or unavailable', () => {
  assert.equal(createClewdProcessOptions({ debug_worldbook: false }, { append() {} }), undefined);
  assert.equal(createClewdProcessOptions({ debug_worldbook: true }, null), undefined);
  assert.equal(createClewdProcessOptions({ debug_worldbook: true }, {}), undefined);
});
