import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveSillyTavernScriptUrl,
  waitForPromptManager,
} from '../../modules/presets/adapters/sillyTavernImports.js';

test('resolveSillyTavernScriptUrl resolves host scripts from third-party extension URLs', () => {
  const url = resolveSillyTavernScriptUrl(
    'openai.js',
    'https://example.test/scripts/extensions/third-party/ST-Archichat/modules/presets/adapters/sillyTavernImports.js',
  );

  assert.equal(url, 'https://example.test/scripts/openai.js');
});

test('resolveSillyTavernScriptUrl resolves host scripts from direct extension URLs', () => {
  const url = resolveSillyTavernScriptUrl(
    'openai.js',
    'https://example.test/scripts/extensions/ST-Archichat/modules/presets/adapters/sillyTavernImports.js',
  );

  assert.equal(url, 'https://example.test/scripts/openai.js');
});

test('waitForPromptManager polls an imported module until promptManager is available', async () => {
  let attempts = 0;
  const module = { promptManager: null };
  const promptManager = { ready: true };

  const result = await waitForPromptManager({
    importOpenAi: async () => module,
    delay: async () => {
      attempts += 1;
      if (attempts === 2) module.promptManager = promptManager;
    },
    maxAttempts: 4,
  });

  assert.equal(result, promptManager);
});
