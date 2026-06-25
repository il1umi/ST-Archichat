import {
  isDeepSeekApiBaseUrl,
  isOpenAiCompatibleCustomSource,
} from '../domain/prefixPolicy.js';

const ASSISTANT_PROMPT_ROLE = 'assistant';
const ASSISTANT_EXTENSION_PROMPT_ROLE = 2;

/**
 * @param {unknown} prompts
 * @returns {Record<string, unknown> | null}
 */
export function getLastEnabledPrompt(prompts) {
  if (!Array.isArray(prompts) || !prompts.length) return null;
  const prompt = prompts[prompts.length - 1];
  return prompt && typeof prompt === 'object' ? prompt : null;
}

/**
 * @param {unknown} role
 * @returns {boolean}
 */
export function isAssistantPromptRole(role) {
  return (
    String(role ?? '').toLowerCase() === ASSISTANT_PROMPT_ROLE ||
    Number(role) === ASSISTANT_EXTENSION_PROMPT_ROLE
  );
}

/**
 * @param {{
 *   chatCompletionSource?: unknown,
 *   customUrl?: unknown,
 *   enabledPrompts?: unknown,
 * }} state
 * @returns {boolean}
 */
export function shouldShowDeepSeekPrefixHint(state) {
  if (!state || typeof state !== 'object') return false;

  return (
    isOpenAiCompatibleCustomSource(state.chatCompletionSource) &&
    isDeepSeekApiBaseUrl(state.customUrl) &&
    isAssistantPromptRole(getLastEnabledPrompt(state.enabledPrompts)?.role)
  );
}
