import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getKeywordActivationConfig,
  hasKeywordActivation,
  matchesAnyKeyword,
  setKeywordActivationConfig,
  shouldKeywordActivatePrompt,
} from '../../modules/presets/domain/keywordActivation.js';

test('empty keyword activation config does not gate a prompt', () => {
  const prompt = { name: 'Definition prompt' };

  assert.deepEqual(getKeywordActivationConfig(prompt), {
    keywords: [],
    caseSensitive: false,
    wholeWords: false,
  });
  assert.equal(hasKeywordActivation(prompt), false);
  assert.equal(shouldKeywordActivatePrompt(prompt, 'anything'), true);
});

test('keyword activation config trims, deduplicates, and ignores empty keywords', () => {
  const prompt = {
    st_archichat: {
      keywordActivation: {
        keywords: [' 批量回溯 ', '', 'Volley', '批量回溯', null, 42],
      },
    },
  };

  assert.deepEqual(getKeywordActivationConfig(prompt), {
    keywords: ['批量回溯', 'Volley'],
    caseSensitive: false,
    wholeWords: false,
  });
  assert.equal(hasKeywordActivation(prompt), true);
});

test('matches keywords case-insensitively by default', () => {
  const config = { keywords: ['Volley'], caseSensitive: false, wholeWords: false };

  assert.equal(matchesAnyKeyword('chain unit: volley + 批量回溯', config), true);
  assert.equal(matchesAnyKeyword('chain unit: silence', config), false);
});

test('supports case-sensitive and whole-word matching for future UI options', () => {
  assert.equal(matchesAnyKeyword('chain unit: volley', {
    keywords: ['Volley'],
    caseSensitive: true,
    wholeWords: false,
  }), false);

  assert.equal(matchesAnyKeyword('prefixVolleySuffix', {
    keywords: ['Volley'],
    caseSensitive: false,
    wholeWords: true,
  }), false);

  assert.equal(matchesAnyKeyword('Slot: Volley + batch attribution', {
    keywords: ['Volley'],
    caseSensitive: false,
    wholeWords: true,
  }), true);
});

test('keyword-gated prompt activates only when scan text contains a keyword', () => {
  const prompt = {
    st_archichat: {
      keywordActivation: {
        keywords: ['批量回溯'],
      },
    },
  };

  assert.equal(shouldKeywordActivatePrompt(prompt, 'Slot 4: 混合叙事（批量回溯）'), true);
  assert.equal(shouldKeywordActivatePrompt(prompt, 'Slot 4: 行动视觉'), false);
});

test('setKeywordActivationConfig writes normalized config and removes empty gates', () => {
  const prompt = { st_archichat: { other: true } };

  setKeywordActivationConfig(prompt, {
    keywords: [' 批量回溯 ', '', '批量回溯', 'Volley'],
    caseSensitive: true,
    wholeWords: true,
  });

  assert.deepEqual(prompt.st_archichat.keywordActivation, {
    keywords: ['批量回溯', 'Volley'],
    caseSensitive: true,
    wholeWords: true,
  });

  setKeywordActivationConfig(prompt, { keywords: [] });

  assert.deepEqual(prompt, { st_archichat: { other: true } });
});
