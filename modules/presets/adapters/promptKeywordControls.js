import {
  getKeywordActivationConfig,
  setKeywordActivationConfig,
} from '../domain/keywordActivation.js';

const KEYWORD_CONTROL_SUFFIX = 'prompt_manager_popup_entry_form_archichat_keyword_activation';
const TRIGGER_CONTROL_SUFFIX = 'prompt_manager_popup_entry_form_injection_trigger';

function normalizeKeywords(values) {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const keywords = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const keyword = value.trim();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    keywords.push(keyword);
  }

  return keywords;
}

function createOption(select, value) {
  const doc = select?.ownerDocument ?? globalThis.document;
  const option = doc?.createElement ? doc.createElement('option') : { selected: false };
  option.value = value;
  option.textContent = value;
  option.selected = true;
  return option;
}

function getJQueryValue(select, jQuery) {
  if (!select || typeof jQuery !== 'function') return null;

  try {
    const value = jQuery(select).val();
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function triggerChange(select, jQuery) {
  if (!select) return;

  try {
    if (typeof jQuery === 'function') {
      jQuery(select).trigger('change');
      return;
    }
  } catch {}

  try {
    select.dispatchEvent?.(new Event('change', { bubbles: true }));
  } catch {}
}

export function getKeywordControlId(prefix = 'completion_') {
  return `${prefix}${KEYWORD_CONTROL_SUFFIX}`;
}

export function createKeywordControlsHtml(prefix = 'completion_') {
  const id = getKeywordControlId(prefix);

  return `
<div id="${id}_block" class="completion_prompt_manager_popup_entry_form_control flex1">
  <label for="${id}">
    <span>关键词触发</span>
  </label>
  <select id="${id}" class="text_pole" name="archichat_keyword_activation" multiple></select>
  <div class="text_muted">只有当已展开提示词中出现这些关键词时，才发送此预设条目。留空则保持默认始终可触发。</div>
</div>`.trim();
}

export function readKeywordControlValue(select, { jQuery = globalThis.$ } = {}) {
  const jqueryValue = getJQueryValue(select, jQuery);
  const values = jqueryValue ?? Array.from(select?.selectedOptions ?? []).map((option) => option.value);

  return {
    keywords: normalizeKeywords(values),
    caseSensitive: false,
    wholeWords: false,
  };
}

export function ensureKeywordControls({
  root = globalThis.document,
  prefix = 'completion_',
  jQuery = globalThis.$,
} = {}) {
  const id = getKeywordControlId(prefix);
  const existing = root?.getElementById?.(id);
  if (existing) return existing;

  const trigger = root?.getElementById?.(`${prefix}${TRIGGER_CONTROL_SUFFIX}`);
  const triggerBlock = trigger?.closest?.('.completion_prompt_manager_popup_entry_form_control') ?? trigger?.parentElement;
  if (!triggerBlock?.insertAdjacentHTML) return null;

  triggerBlock.insertAdjacentHTML('afterend', createKeywordControlsHtml(prefix));
  const select = root?.getElementById?.(id);

  try {
    if (select && typeof jQuery === 'function' && jQuery.fn?.select2) {
      jQuery(select).select2({
        tags: true,
        tokenSeparators: [',', '，', '\n'],
        placeholder: 'Keywords activate this prompt',
        width: '100%',
        closeOnSelect: false,
      });
    }
  } catch (error) {
    console.warn('[ST-Archichat][presets] 关键词触发控件初始化失败', error);
  }

  return select;
}

export function loadKeywordControls(prompt, {
  root = globalThis.document,
  prefix = 'completion_',
  jQuery = globalThis.$,
} = {}) {
  const select = ensureKeywordControls({ root, prefix, jQuery });
  if (!select) return;

  const config = getKeywordActivationConfig(prompt);
  const keywords = config.keywords;

  try {
    select.innerHTML = '';
  } catch {}

  for (const keyword of keywords) {
    const option = createOption(select, keyword);
    if (typeof select.append === 'function') {
      select.append(option);
    } else if (typeof select.add === 'function') {
      select.add(option);
    }
  }

  triggerChange(select, jQuery);
}

export function clearKeywordControls({
  root = globalThis.document,
  prefix = 'completion_',
  jQuery = globalThis.$,
} = {}) {
  loadKeywordControls(null, { root, prefix, jQuery });
}

export function readKeywordControls({
  root = globalThis.document,
  prefix = 'completion_',
  jQuery = globalThis.$,
} = {}) {
  return readKeywordControlValue(root?.getElementById?.(getKeywordControlId(prefix)), { jQuery });
}

export function saveKeywordControlsToPrompt(prompt, {
  root = globalThis.document,
  prefix = 'completion_',
  jQuery = globalThis.$,
} = {}) {
  setKeywordActivationConfig(prompt, readKeywordControls({ root, prefix, jQuery }));
  return prompt;
}
