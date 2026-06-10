import {
  buildActivationScanText,
  shouldActivatePrompt,
} from '../application/activationScan.js';
import { hasKeywordActivation } from '../domain/keywordActivation.js';
import {
  clearKeywordControls,
  ensureKeywordControls,
  loadKeywordControls,
  saveKeywordControlsToPrompt,
} from './promptKeywordControls.js';

const PATCH_STATE = Symbol.for('ST-Archichat.presets.promptManagerPatch');

const DEFAULT_CONTROLS = {
  ensureKeywordControls,
  loadKeywordControls,
  clearKeywordControls,
  saveKeywordControlsToPrompt,
};

function normalizeGenerationType(generationType) {
  return String(generationType || 'normal').toLowerCase().trim();
}

function getPrefix(manager) {
  return manager?.configuration?.prefix || 'completion_';
}

function getPromptOrder(manager) {
  try {
    const order = manager?.getPromptOrderForCharacter?.(manager.activeCharacter);
    return Array.isArray(order) ? order : [];
  } catch {
    return [];
  }
}

function getPromptsInOrder(manager, promptOrder) {
  return promptOrder
    .map((entry) => manager?.getPromptById?.(entry?.identifier))
    .filter((prompt) => prompt && typeof prompt === 'object');
}

function mapRawPromptsById(prompts) {
  const map = new Map();

  for (const prompt of prompts) {
    const key = getPreparedCacheKey(prompt);
    if (key) map.set(key, prompt);
  }

  return map;
}

function getPreparedCacheKey(prompt) {
  return typeof prompt?.identifier === 'string' && prompt.identifier ? prompt.identifier : null;
}

function clonePreparedPrompt(prepared) {
  if (!prepared || typeof prepared !== 'object') return prepared;

  const clone = Object.create(Object.getPrototypeOf(prepared));
  return Object.assign(clone, prepared);
}

function createActivationScanSnapshot(manager, generationType, originals) {
  const promptOrder = getPromptOrder(manager);
  const prompts = getPromptsInOrder(manager, promptOrder);
  const preparedPrompts = new Map();
  const rawPromptsById = mapRawPromptsById(prompts);

  const scanText = buildActivationScanText({
    prompts,
    promptOrder,
    generationType,
    preparePrompt: (prompt) => {
      const prepared = originals.preparePrompt.call(manager, prompt);
      const key = getPreparedCacheKey(prompt);
      if (key) {
        preparedPrompts.set(key, {
          source: prompt,
          prepared: clonePreparedPrompt(prepared),
        });
      }
      return prepared;
    },
    baseShouldTrigger: (prompt, type) => originals.shouldTrigger.call(manager, prompt, type),
  });

  return { scanText, preparedPrompts, rawPromptsById };
}

function getScanTextForShouldTrigger(manager, generationType, state) {
  if (state.context?.generationType === generationType) {
    return state.context.scanText;
  }

  return createActivationScanSnapshot(manager, generationType, state.originals).scanText;
}

function callControl(controls, name, args) {
  try {
    return controls?.[name]?.(...args);
  } catch (error) {
    console.warn(`[ST-Archichat][presets] ${name} failed`, error);
    return undefined;
  }
}

function getPreparedContent(prepared) {
  return typeof prepared?.content === 'string' ? prepared.content.trim() : '';
}

function shouldFinalizeOnCollectionGet(identifier) {
  return identifier === 'main' || identifier === 'jailbreak';
}

function finalizeKeywordActivationCollection(collection, manager, context, state) {
  if (!collection || context.finalized) return;

  const fullScanText = [
    context.scanText,
    ...context.externalChunks,
  ].filter(Boolean).join('\n\n');

  const promptList = Array.isArray(collection)
    ? collection
    : Array.isArray(collection.collection)
      ? collection.collection
      : null;

  if (promptList) {
    const filtered = [];

    for (const preparedPrompt of promptList) {
      const identifier = typeof preparedPrompt === 'string' ? preparedPrompt : preparedPrompt?.identifier;
      const rawPrompt = context.rawPromptsById.get(identifier);
      if (!rawPrompt || !hasKeywordActivation(rawPrompt)) {
        filtered.push(preparedPrompt);
        continue;
      }

      const activated = shouldActivatePrompt({
        prompt: rawPrompt,
        generationType: context.generationType,
        scanText: fullScanText,
        baseShouldTrigger: (candidate, type) => context.originals.shouldTrigger.call(manager, candidate, type),
      });

      if (activated) {
        filtered.push(preparedPrompt);
        continue;
      }

      if (identifier === 'main' && preparedPrompt && typeof preparedPrompt === 'object') {
        preparedPrompt.content = '';
        filtered.push(preparedPrompt);
      }
    }

    promptList.splice(0, promptList.length, ...filtered);
  }

  context.finalized = true;
  if (state.context === context) state.context = null;
}

function installCollectionFinalizer(collection, manager, context, state) {
  if (!collection || typeof collection !== 'object') return collection;

  const originalGet = collection.get;
  if (typeof originalGet !== 'function') {
    finalizeKeywordActivationCollection(collection, manager, context, state);
    return collection;
  }

  if (typeof originalGet === 'function') {
    collection.get = function patchedPromptCollectionGet(identifier, ...args) {
      if (shouldFinalizeOnCollectionGet(identifier)) {
        finalizeKeywordActivationCollection(this, manager, context, state);
      }
      return originalGet.call(this, identifier, ...args);
    };
  }

  return collection;
}

export function patchPromptManager(promptManager, {
  controls = DEFAULT_CONTROLS,
  root = globalThis.document,
  jQuery = globalThis.$,
} = {}) {
  if (!promptManager || typeof promptManager !== 'object') return () => {};
  if (promptManager[PATCH_STATE]) return () => {};

  const originals = {
    getPromptCollection: promptManager.getPromptCollection,
    shouldTrigger: promptManager.shouldTrigger,
    preparePrompt: promptManager.preparePrompt,
    loadPromptIntoEditForm: promptManager.loadPromptIntoEditForm,
    clearEditForm: promptManager.clearEditForm,
    updatePromptWithPromptEditForm: promptManager.updatePromptWithPromptEditForm,
  };

  if (
    typeof originals.getPromptCollection !== 'function' ||
    typeof originals.shouldTrigger !== 'function' ||
    typeof originals.preparePrompt !== 'function'
  ) {
    return () => {};
  }

  const state = { originals, context: null };
  Object.defineProperty(promptManager, PATCH_STATE, {
    value: state,
    configurable: true,
  });

  promptManager.getPromptCollection = function patchedGetPromptCollection(generationType, ...rest) {
    const normalizedType = normalizeGenerationType(generationType);
    const snapshot = createActivationScanSnapshot(this, normalizedType, originals);
    const context = {
      generationType: normalizedType,
      scanText: snapshot.scanText,
      preparedPrompts: snapshot.preparedPrompts,
      rawPromptsById: snapshot.rawPromptsById,
      externalChunks: [],
      originals,
      phase: 'initialCollection',
      finalized: false,
    };
    state.context = context;

    try {
      const collection = originals.getPromptCollection.call(this, generationType, ...rest);
      context.phase = 'mergeExternal';
      return installCollectionFinalizer(collection, this, context, state);
    } catch (error) {
      if (state.context === context) state.context = null;
      throw error;
    }
  };

  promptManager.preparePrompt = function patchedPreparePrompt(prompt, ...rest) {
    const key = getPreparedCacheKey(prompt);
    const cached = key ? state.context?.preparedPrompts?.get(key) : null;
    if (cached?.source === prompt) return clonePreparedPrompt(cached.prepared);

    const prepared = originals.preparePrompt.call(this, prompt, ...rest);
    const context = state.context;

    if (context?.phase === 'mergeExternal' && !hasKeywordActivation(prompt)) {
      const content = getPreparedContent(prepared);
      if (content) context.externalChunks.push(content);
    }

    return prepared;
  };

  promptManager.shouldTrigger = function patchedShouldTrigger(prompt, generationType) {
    const normalizedType = normalizeGenerationType(generationType);
    const baseShouldTrigger = (candidate, type) => originals.shouldTrigger.call(this, candidate, type);

    if (state.context?.phase === 'initialCollection' && hasKeywordActivation(prompt)) {
      return baseShouldTrigger(prompt, normalizedType);
    }

    const scanText = getScanTextForShouldTrigger(this, normalizedType, state);

    return shouldActivatePrompt({
      prompt,
      generationType: normalizedType,
      scanText,
      baseShouldTrigger,
    });
  };

  if (typeof originals.loadPromptIntoEditForm === 'function') {
    promptManager.loadPromptIntoEditForm = function patchedLoadPromptIntoEditForm(prompt, ...rest) {
      const result = originals.loadPromptIntoEditForm.call(this, prompt, ...rest);
      const prefix = getPrefix(this);
      callControl(controls, 'ensureKeywordControls', [{ root, prefix, jQuery }]);
      callControl(controls, 'loadKeywordControls', [prompt, { root, prefix, jQuery }]);
      return result;
    };
  }

  if (typeof originals.clearEditForm === 'function') {
    promptManager.clearEditForm = function patchedClearEditForm(...args) {
      const result = originals.clearEditForm.apply(this, args);
      callControl(controls, 'clearKeywordControls', [{ root, prefix: getPrefix(this), jQuery }]);
      return result;
    };
  }

  if (typeof originals.updatePromptWithPromptEditForm === 'function') {
    promptManager.updatePromptWithPromptEditForm = function patchedUpdatePromptWithPromptEditForm(prompt, ...rest) {
      const result = originals.updatePromptWithPromptEditForm.call(this, prompt, ...rest);
      callControl(controls, 'saveKeywordControlsToPrompt', [prompt, { root, prefix: getPrefix(this), jQuery }]);
      return result;
    };
  }

  return function cleanupPromptManagerPatch() {
    if (promptManager[PATCH_STATE] !== state) return;

    for (const [name, original] of Object.entries(originals)) {
      if (typeof original === 'function') {
        promptManager[name] = original;
      }
    }

    delete promptManager[PATCH_STATE];
  };
}
