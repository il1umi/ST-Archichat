import test from 'node:test';
import assert from 'node:assert/strict';

import { patchPromptManager } from '../../modules/presets/adapters/promptManagerPatch.js';

function createFakePromptManager() {
  const prompts = [
    { identifier: 'framework', content: 'raw outline' },
    {
      identifier: 'definitionHit',
      content: 'definition content',
      st_archichat: { keywordActivation: { keywords: ['批量回溯'] } },
    },
    {
      identifier: 'definitionMiss',
      content: 'miss content',
      st_archichat: { keywordActivation: { keywords: ['不存在'] } },
    },
    { identifier: 'plain', content: 'plain content' },
  ];
  const order = prompts.map((prompt) => ({ identifier: prompt.identifier, enabled: true }));

  return {
    activeCharacter: null,
    configuration: { prefix: 'completion_' },
    prompts,
    order,
    getPromptOrderForCharacter() {
      return this.order;
    },
    getPromptById(identifier) {
      return this.prompts.find((prompt) => prompt.identifier === identifier);
    },
    preparePrompt(prompt) {
      return {
        ...prompt,
        content: prompt.identifier === 'framework'
          ? '段落：混合叙事（批量回溯）'
          : prompt.content,
      };
    },
    shouldTrigger(prompt) {
      return prompt?.identifier !== 'plainBlocked';
    },
    getPromptCollection(generationType) {
      return this.getPromptOrderForCharacter(this.activeCharacter)
        .filter((entry) => {
          const prompt = this.getPromptById(entry.identifier);
          return entry.enabled && this.shouldTrigger(prompt, generationType);
        })
        .map((entry) => this.preparePrompt(this.getPromptById(entry.identifier)).identifier);
    },
    loadPromptIntoEditForm(prompt) {
      this.lastLoaded = prompt.identifier;
    },
    clearEditForm() {
      this.cleared = true;
    },
    updatePromptWithPromptEditForm(prompt) {
      prompt.updatedByOriginal = true;
    },
  };
}

test('patchPromptManager gates preset prompts by expanded non-gated prompt content', () => {
  const manager = createFakePromptManager();

  const cleanup = patchPromptManager(manager, { controls: {} });

  assert.deepEqual(manager.getPromptCollection('normal'), [
    'framework',
    'definitionHit',
    'plain',
  ]);

  cleanup();
});

test('patchPromptManager reuses scanned macro expansion for final non-gated prompts', () => {
  let prepareCalls = 0;
  const prompts = [
    { identifier: 'framework', content: '{{cascade_qxs}}' },
    {
      identifier: 'definitionHit',
      content: 'definition content',
      st_archichat: { keywordActivation: { keywords: ['批量回溯'] } },
    },
  ];
  const manager = {
    activeCharacter: null,
    configuration: { prefix: 'completion_' },
    prompts,
    order: prompts.map((prompt) => ({ identifier: prompt.identifier, enabled: true })),
    getPromptOrderForCharacter() {
      return this.order;
    },
    getPromptById(identifier) {
      return this.prompts.find((prompt) => prompt.identifier === identifier);
    },
    preparePrompt(prompt) {
      if (prompt.identifier !== 'framework') return { ...prompt };
      prepareCalls += 1;
      return {
        ...prompt,
        content: prepareCalls === 1 ? '段落：批量回溯' : '段落：不应该重抽',
      };
    },
    shouldTrigger() {
      return true;
    },
    getPromptCollection(generationType) {
      return this.getPromptOrderForCharacter(this.activeCharacter)
        .filter((entry) => {
          const prompt = this.getPromptById(entry.identifier);
          return entry.enabled && this.shouldTrigger(prompt, generationType);
        })
        .map((entry) => this.preparePrompt(this.getPromptById(entry.identifier)).content);
    },
  };

  const cleanup = patchPromptManager(manager, { controls: {} });

  assert.deepEqual(manager.getPromptCollection('normal'), [
    '段落：批量回溯',
    'definition content',
  ]);

  cleanup();
});

test('patchPromptManager preserves host Prompt instances when reusing scanned prompts', () => {
  class HostPrompt {
    constructor(values) {
      Object.assign(this, values);
    }
  }

  let prepareCalls = 0;
  const prompts = [{ identifier: 'framework', content: '{{cascade_qxs}}' }];
  const manager = {
    activeCharacter: null,
    configuration: { prefix: 'completion_' },
    prompts,
    order: [{ identifier: 'framework', enabled: true }],
    getPromptOrderForCharacter() {
      return this.order;
    },
    getPromptById(identifier) {
      return this.prompts.find((prompt) => prompt.identifier === identifier);
    },
    preparePrompt(prompt) {
      prepareCalls += 1;
      return new HostPrompt({ ...prompt, content: '段落：批量回溯' });
    },
    shouldTrigger() {
      return true;
    },
    getPromptCollection(generationType) {
      const collection = [];
      collection.add = (prompt) => {
        if (!(prompt instanceof HostPrompt)) {
          throw new Error('Only Prompt instances can be added to PromptCollection');
        }
        collection.push(prompt);
      };

      for (const entry of this.getPromptOrderForCharacter(this.activeCharacter)) {
        const prompt = this.getPromptById(entry.identifier);
        if (entry.enabled && this.shouldTrigger(prompt, generationType)) {
          collection.add(this.preparePrompt(prompt));
        }
      }

      return collection;
    },
  };

  const cleanup = patchPromptManager(manager, { controls: {} });
  const collection = manager.getPromptCollection('normal');

  assert.equal(collection[0] instanceof HostPrompt, true);
  assert.equal(prepareCalls, 1);

  cleanup();
});

test('patchPromptManager activates gated presets from later merged system prompt content', () => {
  const prompts = [
    { identifier: 'main', content: 'main content' },
    {
      identifier: 'definitionFromWorldInfo',
      content: 'definition content',
      st_archichat: { keywordActivation: { keywords: ['批量回溯'] } },
    },
    {
      identifier: 'definitionMiss',
      content: 'miss content',
      st_archichat: { keywordActivation: { keywords: ['镜头切换'] } },
    },
  ];
  const manager = {
    activeCharacter: null,
    configuration: { prefix: 'completion_' },
    prompts,
    order: prompts.map((prompt) => ({ identifier: prompt.identifier, enabled: true })),
    getPromptOrderForCharacter() {
      return this.order;
    },
    getPromptById(identifier) {
      return this.prompts.find((prompt) => prompt.identifier === identifier);
    },
    preparePrompt(prompt) {
      return { ...prompt };
    },
    shouldTrigger() {
      return true;
    },
    getPromptCollection(generationType) {
      const collection = {
        collection: [],
        add(...items) {
          this.collection.push(...items);
        },
        get(identifier) {
          return this.collection.find((prompt) => prompt.identifier === identifier);
        },
        index(identifier) {
          return this.collection.findIndex((prompt) => prompt.identifier === identifier);
        },
      };

      for (const entry of this.getPromptOrderForCharacter(this.activeCharacter)) {
        const prompt = this.getPromptById(entry.identifier);
        if (entry.enabled && this.shouldTrigger(prompt, generationType)) {
          collection.add(this.preparePrompt(prompt));
        }
      }

      return collection;
    },
  };

  const cleanup = patchPromptManager(manager, { controls: {} });
  const collection = manager.getPromptCollection('normal');

  collection.add(manager.preparePrompt({
    identifier: 'worldInfoBefore',
    role: 'system',
    content: '世界书最终注入：批量回溯',
  }));

  collection.get('main');

  assert.deepEqual(collection.collection.map((prompt) => prompt.identifier), [
    'main',
    'definitionFromWorldInfo',
    'worldInfoBefore',
  ]);

  cleanup();
});

test('patchPromptManager keeps an empty main placeholder when keyword-gated main misses', () => {
  const prompts = [
    {
      identifier: 'main',
      content: 'main content',
      st_archichat: { keywordActivation: { keywords: ['不会命中'] } },
    },
  ];
  const manager = {
    activeCharacter: null,
    configuration: { prefix: 'completion_' },
    prompts,
    order: [{ identifier: 'main', enabled: true }],
    getPromptOrderForCharacter() {
      return this.order;
    },
    getPromptById(identifier) {
      return this.prompts.find((prompt) => prompt.identifier === identifier);
    },
    preparePrompt(prompt) {
      return { ...prompt };
    },
    shouldTrigger() {
      return true;
    },
    getPromptCollection(generationType) {
      const collection = {
        collection: [],
        add(...items) {
          this.collection.push(...items);
        },
        get(identifier) {
          return this.collection.find((prompt) => prompt.identifier === identifier);
        },
      };

      for (const entry of this.getPromptOrderForCharacter(this.activeCharacter)) {
        const prompt = this.getPromptById(entry.identifier);
        if (entry.enabled && this.shouldTrigger(prompt, generationType)) {
          collection.add(this.preparePrompt(prompt));
        }
      }

      return collection;
    },
  };

  const cleanup = patchPromptManager(manager, { controls: {} });
  const collection = manager.getPromptCollection('normal');

  assert.deepEqual(collection.get('main'), {
    identifier: 'main',
    content: '',
    st_archichat: { keywordActivation: { keywords: ['不会命中'] } },
  });

  cleanup();
});

test('patchPromptManager syncs keyword controls while preserving original form methods', () => {
  const manager = createFakePromptManager();
  const calls = [];
  const controls = {
    ensureKeywordControls: () => calls.push('ensure'),
    loadKeywordControls: (prompt) => calls.push(`load:${prompt.identifier}`),
    clearKeywordControls: () => calls.push('clear'),
    saveKeywordControlsToPrompt: (prompt) => {
      calls.push(`save:${prompt.identifier}`);
      prompt.savedByControls = true;
    },
  };

  const cleanup = patchPromptManager(manager, { controls });
  const prompt = { identifier: 'definitionHit' };

  manager.loadPromptIntoEditForm(prompt);
  manager.updatePromptWithPromptEditForm(prompt);
  manager.clearEditForm();

  assert.equal(manager.lastLoaded, 'definitionHit');
  assert.equal(prompt.updatedByOriginal, true);
  assert.equal(prompt.savedByControls, true);
  assert.equal(manager.cleared, true);
  assert.deepEqual(calls, [
    'ensure',
    'load:definitionHit',
    'save:definitionHit',
    'clear',
  ]);

  cleanup();
});

test('patchPromptManager cleanup restores original methods and repeated patching is a no-op', () => {
  const manager = createFakePromptManager();
  const originalShouldTrigger = manager.shouldTrigger;

  const cleanupA = patchPromptManager(manager, { controls: {} });
  const patchedShouldTrigger = manager.shouldTrigger;
  const cleanupB = patchPromptManager(manager, { controls: {} });

  assert.equal(manager.shouldTrigger, patchedShouldTrigger);

  cleanupB();
  assert.equal(manager.shouldTrigger, patchedShouldTrigger);

  cleanupA();
  assert.equal(manager.shouldTrigger, originalShouldTrigger);
});
