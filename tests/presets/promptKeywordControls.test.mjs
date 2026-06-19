import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createKeywordControlsHtml,
  readKeywordControlValue,
  saveKeywordControlsToPrompt,
} from '../../modules/presets/adapters/promptKeywordControls.js';

test('createKeywordControlsHtml renders a Tavern-style keyword trigger field near prompt triggers', () => {
  const html = createKeywordControlsHtml('completion_');

  assert.match(html, /completion_prompt_manager_popup_entry_form_archichat_keyword_activation/);
  assert.match(html, /completion_prompt_manager_popup_entry_form_control flex1/);
  assert.match(html, /class="text_pole"/);
  assert.match(html, /multiple/);
  assert.match(html, /关键词触发/);
});

test('readKeywordControlValue reads selected keyword tags', () => {
  const select = {
    selectedOptions: [
      { value: ' 批量回溯 ' },
      { value: '' },
      { value: 'Volley' },
    ],
  };

  assert.deepEqual(readKeywordControlValue(select), {
    keywords: ['批量回溯', 'Volley'],
    caseSensitive: false,
    wholeWords: false,
  });
});

test('saveKeywordControlsToPrompt stores keyword activation on the prompt', () => {
  const prompt = { name: 'Definition' };
  const root = {
    getElementById: () => ({
      selectedOptions: [
        { value: '批量回溯' },
        { value: 'Volley' },
      ],
    }),
  };

  saveKeywordControlsToPrompt(prompt, { root, prefix: 'completion_' });

  assert.deepEqual(prompt.st_archichat.keywordActivation, {
    keywords: ['批量回溯', 'Volley'],
    caseSensitive: false,
    wholeWords: false,
  });
});
