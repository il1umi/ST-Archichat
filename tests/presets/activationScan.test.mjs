import test from 'node:test';
import assert from 'node:assert/strict';

import { buildActivationScanText } from '../../modules/presets/application/activationScan.js';

test('buildActivationScanText uses prepared non-gated prompt content as scan source', () => {
  const prompts = [
    { identifier: 'framework', content: 'raw {{cascade_qxs}}' },
    {
      identifier: 'batchDefinition',
      content: 'definition should not self-trigger',
      st_archichat: { keywordActivation: { keywords: ['批量回溯'] } },
    },
  ];
  const promptOrder = [
    { identifier: 'framework', enabled: true },
    { identifier: 'batchDefinition', enabled: true },
  ];

  const scanText = buildActivationScanText({
    prompts,
    promptOrder,
    generationType: 'normal',
    preparePrompt: (prompt) => ({ content: prompt.identifier === 'framework'
      ? '段落：混合叙事（批量回溯）'
      : prompt.content }),
    baseShouldTrigger: () => true,
  });

  assert.equal(scanText, '段落：混合叙事（批量回溯）');
});

test('buildActivationScanText skips disabled and generation-type-filtered prompts', () => {
  const prompts = [
    { identifier: 'enabled', content: 'enabled content' },
    { identifier: 'disabled', content: 'disabled content' },
    { identifier: 'filtered', content: 'filtered content' },
  ];
  const promptOrder = [
    { identifier: 'enabled', enabled: true },
    { identifier: 'disabled', enabled: false },
    { identifier: 'filtered', enabled: true },
  ];

  const scanText = buildActivationScanText({
    prompts,
    promptOrder,
    generationType: 'normal',
    preparePrompt: (prompt) => ({ content: prompt.content }),
    baseShouldTrigger: (prompt) => prompt.identifier !== 'filtered',
  });

  assert.equal(scanText, 'enabled content');
});

test('buildActivationScanText ignores empty or missing prepared content', () => {
  const prompts = [
    { identifier: 'empty', content: '' },
    { identifier: 'missing', content: 'missing' },
    { identifier: 'valid', content: 'valid content' },
  ];
  const promptOrder = [
    { identifier: 'empty', enabled: true },
    { identifier: 'missing', enabled: true },
    { identifier: 'valid', enabled: true },
  ];

  const scanText = buildActivationScanText({
    prompts,
    promptOrder,
    generationType: 'normal',
    preparePrompt: (prompt) => {
      if (prompt.identifier === 'missing') return null;
      return { content: prompt.content };
    },
    baseShouldTrigger: () => true,
  });

  assert.equal(scanText, 'valid content');
});
