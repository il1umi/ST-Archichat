const EXTENSION_FIELD = 'st_archichat';
const KEYWORD_ACTIVATION_FIELD = 'keywordActivation';

function uniqueNonEmptyStrings(values) {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const keyword = value.trim();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    result.push(keyword);
  }

  return result;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordActivationConfig(config) {
  return {
    keywords: uniqueNonEmptyStrings(config?.keywords),
    caseSensitive: config?.caseSensitive === true,
    wholeWords: config?.wholeWords === true,
  };
}

export function getKeywordActivationConfig(prompt) {
  const raw = prompt?.[EXTENSION_FIELD]?.[KEYWORD_ACTIVATION_FIELD];

  return buildKeywordActivationConfig(raw);
}

export function setKeywordActivationConfig(prompt, config) {
  if (!prompt || typeof prompt !== 'object') return prompt;

  const normalized = buildKeywordActivationConfig(config);
  if (!normalized.keywords.length) {
    if (prompt[EXTENSION_FIELD] && typeof prompt[EXTENSION_FIELD] === 'object') {
      delete prompt[EXTENSION_FIELD][KEYWORD_ACTIVATION_FIELD];
      if (!Object.keys(prompt[EXTENSION_FIELD]).length) {
        delete prompt[EXTENSION_FIELD];
      }
    }
    return prompt;
  }

  prompt[EXTENSION_FIELD] ||= {};
  prompt[EXTENSION_FIELD][KEYWORD_ACTIVATION_FIELD] = normalized;
  return prompt;
}

export function hasKeywordActivation(prompt) {
  return getKeywordActivationConfig(prompt).keywords.length > 0;
}

export function matchesAnyKeyword(text, config) {
  if (typeof text !== 'string' || !text) return false;

  const keywords = uniqueNonEmptyStrings(config?.keywords);
  if (!keywords.length) return false;

  const flags = config?.caseSensitive === true ? 'u' : 'iu';

  return keywords.some((keyword) => {
    if (config?.wholeWords === true) {
      const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(keyword)}(?![\\p{L}\\p{N}_])`, flags);
      return pattern.test(text);
    }

    return config?.caseSensitive === true
      ? text.includes(keyword)
      : text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
  });
}

export function shouldKeywordActivatePrompt(prompt, scanText) {
  const config = getKeywordActivationConfig(prompt);
  if (!config.keywords.length) return true;
  return matchesAnyKeyword(scanText, config);
}
