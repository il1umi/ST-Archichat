import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyDeepSeekAssistantPrefix,
  shouldApplyDeepSeekAssistantPrefix,
} from '../../modules/deepseek-prefix/domain/prefixPolicy.js';
import { shouldShowDeepSeekPrefixHint } from '../../modules/deepseek-prefix/application/hintVisibility.js';

test('marks the trailing assistant message for DeepSeek custom OpenAI-compatible requests', () => {
  const completion = {
    chat_completion_source: 'custom',
    custom_url: 'https://api.deepseek.com/v1',
    messages: [
      { role: 'user', content: 'Please write quick sort code' },
      { role: 'assistant', content: '```python\n' },
    ],
  };

  assert.equal(shouldApplyDeepSeekAssistantPrefix(completion), true);
  assert.equal(applyDeepSeekAssistantPrefix(completion), true);
  assert.equal(completion.messages.at(-1).prefix, true);
});

test('does not mark a trailing user message', () => {
  const completion = {
    chat_completion_source: 'custom',
    custom_url: 'https://api.deepseek.com/v1',
    messages: [
      { role: 'assistant', content: 'Earlier answer' },
      { role: 'user', content: 'Continue' },
    ],
  };

  assert.equal(applyDeepSeekAssistantPrefix(completion), false);
  assert.equal('prefix' in completion.messages.at(-1), false);
});

test('does not mark non-DeepSeek custom endpoints', () => {
  const completion = {
    chat_completion_source: 'custom',
    custom_url: 'https://example.com/v1',
    messages: [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ],
  };

  assert.equal(applyDeepSeekAssistantPrefix(completion), false);
  assert.equal('prefix' in completion.messages.at(-1), false);
});

test('does not mark DeepSeek built-in source requests', () => {
  const completion = {
    chat_completion_source: 'deepseek',
    custom_url: 'https://api.deepseek.com/v1',
    messages: [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ],
  };

  assert.equal(applyDeepSeekAssistantPrefix(completion), false);
  assert.equal('prefix' in completion.messages.at(-1), false);
});

test('shows hint only when custom DeepSeek URL and last enabled prompt is assistant', () => {
  assert.equal(shouldShowDeepSeekPrefixHint({
    chatCompletionSource: 'custom',
    customUrl: 'https://api.deepseek.com/v1',
    enabledPrompts: [{ role: 'system' }, { role: 'assistant' }],
  }), true);

  assert.equal(shouldShowDeepSeekPrefixHint({
    chatCompletionSource: 'openai',
    customUrl: 'https://api.deepseek.com/v1',
    enabledPrompts: [{ role: 'assistant' }],
  }), false);

  assert.equal(shouldShowDeepSeekPrefixHint({
    chatCompletionSource: 'custom',
    customUrl: 'https://example.com/v1',
    enabledPrompts: [{ role: 'assistant' }],
  }), false);

  assert.equal(shouldShowDeepSeekPrefixHint({
    chatCompletionSource: 'custom',
    customUrl: 'https://api.deepseek.com/v1',
    enabledPrompts: [{ role: 'assistant' }, { role: 'user' }],
  }), false);
});
