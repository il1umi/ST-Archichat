import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLastCompletionSnapshot,
  notifyStoredDataView,
  setRefreshStoredDataView,
  updateLastCompletionSnapshot,
} from '../../modules/noass/runtime/completionSession.js';

test('completion session stores cloned completion snapshots', () => {
  const state = { active: 'A' };
  const template = { user: 'Human', nested: { value: 1 } };
  const messages = [{ role: 'user', content: 'hello' }];
  const completion = { chat_completion_source: 'openai' };

  updateLastCompletionSnapshot(state, template, messages, completion, 'tool_calls');
  template.nested.value = 2;
  messages[0].content = 'changed';

  const snapshot = getLastCompletionSnapshot();
  assert.equal(snapshot.templateName, 'A');
  assert.equal(snapshot.template.nested.value, 1);
  assert.equal(snapshot.messages[0].content, 'hello');
  assert.equal(snapshot.source, 'openai');
  assert.equal(snapshot.skippedReason, 'tool_calls');
  assert.equal(typeof snapshot.timestamp, 'number');
});

test('completion session notifies the current stored-data refresh callback only', () => {
  let count = 0;

  setRefreshStoredDataView(() => {
    count += 1;
  });
  notifyStoredDataView();
  setRefreshStoredDataView(null);
  notifyStoredDataView();

  assert.equal(count, 1);
});
