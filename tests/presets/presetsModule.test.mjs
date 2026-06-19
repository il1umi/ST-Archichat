import test from 'node:test';
import assert from 'node:assert/strict';

import { mount, unmount } from '../../modules/presets/presets.module.js';

test('presets module mounts and cleans up the prompt manager patch', async () => {
  const promptManager = { ready: true };
  let patchedManager = null;
  let cleaned = false;

  await mount(null, {
    waitForPromptManager: async () => promptManager,
    patchPromptManager: (manager) => {
      patchedManager = manager;
      return () => {
        cleaned = true;
      };
    },
  });

  assert.equal(patchedManager, promptManager);

  await unmount();

  assert.equal(cleaned, true);
});
