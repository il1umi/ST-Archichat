import test from 'node:test';
import assert from 'node:assert/strict';

import { captureMergeBlockData } from '../../modules/noass/runtime/mergeBlockCapture.js';

test('captureMergeBlockData combines string message content and reports stored data changes', () => {
  const rule = { enabled: true, regex: '/name=\\w+/g', tag: 'names', updateMode: 'accumulate' };
  const template = { capture_enabled: true, capture_rules: [rule], stored_data: {} };
  const config = { capture_enabled: true, capture_rules: [rule] };
  const block = [
    { role: 'user', content: 'name=alice' },
    { role: 'assistant', content: [{ type: 'image_url', image_url: { url: 'x' } }] },
    { role: 'user', content: 'name=bob' },
  ];

  assert.equal(captureMergeBlockData(template, config, block), true);
  assert.deepEqual(template.stored_data.names, ['name=alice', 'name=bob']);
  assert.equal(captureMergeBlockData(template, config, block), false);
});

test('captureMergeBlockData skips capture when runtime capture is disabled', () => {
  const template = {
    capture_enabled: true,
    capture_rules: [{ enabled: true, regex: '/x/', tag: 'x' }],
    stored_data: {},
  };
  const config = { capture_enabled: false, capture_rules: template.capture_rules };

  assert.equal(captureMergeBlockData(template, config, [{ role: 'user', content: 'x' }]), false);
  assert.deepEqual(template.stored_data, {});
});
