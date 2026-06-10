import {
  hasKeywordActivation,
  shouldKeywordActivatePrompt,
} from '../domain/keywordActivation.js';

function mapPromptsById(prompts) {
  const map = new Map();
  if (!Array.isArray(prompts)) return map;

  for (const prompt of prompts) {
    if (!prompt || typeof prompt !== 'object') continue;
    if (typeof prompt.identifier !== 'string' || !prompt.identifier) continue;
    map.set(prompt.identifier, prompt);
  }

  return map;
}

function getPreparedContent(prompt, preparePrompt) {
  if (typeof preparePrompt !== 'function') return '';

  try {
    const prepared = preparePrompt(prompt);
    return typeof prepared?.content === 'string' ? prepared.content.trim() : '';
  } catch {
    return '';
  }
}

export function buildActivationScanText({
  prompts,
  promptOrder,
  generationType = 'normal',
  preparePrompt,
  baseShouldTrigger,
} = {}) {
  if (!Array.isArray(promptOrder) || !promptOrder.length) return '';

  const promptMap = mapPromptsById(prompts);
  const chunks = [];

  for (const entry of promptOrder) {
    if (!entry || entry.enabled === false) continue;

    const prompt = promptMap.get(entry.identifier);
    if (!prompt || hasKeywordActivation(prompt)) continue;

    if (typeof baseShouldTrigger === 'function' && !baseShouldTrigger(prompt, generationType)) {
      continue;
    }

    const content = getPreparedContent(prompt, preparePrompt);
    if (content) chunks.push(content);
  }

  return chunks.join('\n\n');
}

export function shouldActivatePrompt({
  prompt,
  generationType = 'normal',
  scanText = '',
  baseShouldTrigger,
} = {}) {
  if (!prompt || typeof prompt !== 'object') return false;

  if (typeof baseShouldTrigger === 'function' && !baseShouldTrigger(prompt, generationType)) {
    return false;
  }

  return shouldKeywordActivatePrompt(prompt, scanText);
}
