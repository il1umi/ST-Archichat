import test from 'node:test';
import assert from 'node:assert/strict';

import { composeClewdPrompt } from '../../modules/noass/runtime/clewd/promptComposer.js';

const prefixs = {
  user: 'Human',
  assistant: 'Assistant',
  system: 'System',
};

test('composeClewdPrompt preserves invalid-message callbacks, regex log, and non-Claude suffix', () => {
  const invalidMessages = [];
  const events = [];
  const messages = [
    { role: 'user', content: '' },
    null,
    { role: 'user', content: 'hello\n<regex order=1> "hello" : "hi" </regex>' },
  ];

  const result = composeClewdPrompt(prefixs, messages, {
    claudeMode: false,
    logHandler: (event, payload) => events.push({ event, payload }),
    onInvalidMessage: (message) => invalidMessages.push(message),
  });

  assert.equal(result.prompt, '\n\nHuman: hi\n\nAssistant:');
  assert.equal(result.log, '\n####### Regex:\n<regex order=1> "hello" : "hi" </regex>\n');
  assert.equal(invalidMessages.length, 2);
  assert.deepEqual(
    events.map(({ event, payload }) => [event, payload.order, payload.match]),
    [['hyperRegex:match', 1, '<regex order=1> "hello" : "hi" </regex>']],
  );
});

test('composeClewdPrompt omits role colon when user and assistant prefixes are explicitly empty', () => {
  const emptyPrefixes = {
    user: '',
    assistant: '',
    system: 'System',
  };

  const result = composeClewdPrompt(emptyPrefixes, [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'reply' },
  ], {
    claudeMode: false,
  });

  assert.equal(result.prompt, 'hello\n\nreply');
  assert.equal(result.prompt.includes(':\n'), false);
  assert.equal(result.prompt.endsWith(':'), false);
});

test('composeClewdPrompt preserves empty message short-circuit', () => {
  assert.deepEqual(composeClewdPrompt(prefixs, []), { prompt: '', log: '' });
  assert.deepEqual(composeClewdPrompt(prefixs, null), { prompt: '', log: '' });
});
