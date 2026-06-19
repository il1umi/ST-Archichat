import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldActivatePrompt } from '../../modules/presets/application/activationScan.js';

test('shouldActivatePrompt keeps base generation trigger behavior for non-gated prompts', () => {
  const prompt = { identifier: 'plain' };

  assert.equal(shouldActivatePrompt({
    prompt,
    generationType: 'normal',
    scanText: 'anything',
    baseShouldTrigger: () => false,
  }), false);

  assert.equal(shouldActivatePrompt({
    prompt,
    generationType: 'normal',
    scanText: '',
    baseShouldTrigger: () => true,
  }), true);
});

test('shouldActivatePrompt requires both base trigger and keyword match for gated prompts', () => {
  const prompt = {
    identifier: 'batchDefinition',
    st_archichat: { keywordActivation: { keywords: ['批量回溯'] } },
  };

  assert.equal(shouldActivatePrompt({
    prompt,
    generationType: 'normal',
    scanText: '段落：混合叙事（批量回溯）',
    baseShouldTrigger: () => false,
  }), false);

  assert.equal(shouldActivatePrompt({
    prompt,
    generationType: 'normal',
    scanText: '段落：行动视觉',
    baseShouldTrigger: () => true,
  }), false);

  assert.equal(shouldActivatePrompt({
    prompt,
    generationType: 'normal',
    scanText: '段落：混合叙事（批量回溯）',
    baseShouldTrigger: () => true,
  }), true);
});
