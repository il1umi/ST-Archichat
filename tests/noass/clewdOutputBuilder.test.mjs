import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAssistantOutput } from '../../modules/noass/runtime/clewd/outputBuilder.js';

test('buildAssistantOutput does not treat empty role prefixes as bare colon boundaries', () => {
  const result = buildAssistantOutput('first: value\n\nsecond: value', {
    user: '',
    assistant: '',
    separator: '---',
  });

  assert.deepEqual(result, {
    role: 'assistant',
    content: 'first: value\n\nsecond: value',
  });
});

test('buildAssistantOutput still applies turn separator for non-empty role prefixes', () => {
  const result = buildAssistantOutput('Human: one\n\nAssistant: two', {
    user: 'Human',
    assistant: 'Assistant',
    separator: '---',
  });

  assert.deepEqual(result, {
    role: 'assistant',
    content: 'Human: one\n---\nAssistant: two',
  });
});
