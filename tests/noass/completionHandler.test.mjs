import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultTemplate } from '../../modules/noass/state/defaults.js';
import { handleCompletion } from '../../modules/noass/runtime/completionHandler.js';

test('handleCompletion rewrites completion messages through noass processing', () => {
  const template = {
    ...defaultTemplate,
    capture_enabled: false,
    inject_prefill: false,
    worldbook_groups: [],
    stored_data: {},
  };
  const state = { enabled: true, active: 'main', templates: { main: template } };
  const completion = { messages: [{ role: 'user', content: 'hello' }] };

  handleCompletion({}, state, completion);

  assert.deepEqual(completion.messages, [{ role: 'assistant', content: 'Human: hello' }]);
});

test('handleCompletion skips noass when tool calls are present', () => {
  const template = { ...defaultTemplate, stored_data: {} };
  const state = { enabled: true, active: 'main', templates: { main: template } };
  const original = [{ role: 'assistant', content: 'tooling', tool_calls: [{ id: 'x' }] }];
  const completion = { messages: original };

  handleCompletion({}, state, completion);

  assert.equal(completion.messages, original);
});

test('handleCompletion 模块总闸关闭时完全不介入', () => {
  const template = { ...defaultTemplate, stored_data: {} };
  const state = { enabled: false, active: 'main', templates: { main: template } };
  const original = [{ role: 'user', content: 'hello' }];
  const completion = { messages: original };

  handleCompletion({}, state, completion);

  assert.equal(completion.messages, original);
});

test('handleCompletion 仅启用世界书搬运时不压缩对话', () => {
  const template = {
    ...defaultTemplate,
    merge_enabled: false,
    worldbook_enabled: true,
    capture_enabled: false,
    inject_prefill: false,
    worldbook_groups: [],
    stored_data: {},
  };
  const state = { enabled: true, active: 'main', templates: { main: template } };
  const completion = { messages: [{ role: 'user', content: 'hello' }] };

  handleCompletion({}, state, completion);

  assert.deepEqual(completion.messages, [{ role: 'user', content: 'hello' }]);
});

test('handleCompletion 合并与世界书子开关都关时不压缩对话', () => {
  const template = {
    ...defaultTemplate,
    merge_enabled: false,
    worldbook_enabled: false,
    worldbook_groups: [],
    stored_data: {},
  };
  const state = { enabled: true, active: 'main', templates: { main: template } };
  const completion = { messages: [{ role: 'user', content: 'hello' }] };

  handleCompletion({}, state, completion);

  assert.deepEqual(completion.messages, [{ role: 'user', content: 'hello' }]);
});
