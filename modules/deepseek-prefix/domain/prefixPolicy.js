export const OPENAI_COMPATIBLE_CUSTOM_SOURCE = 'custom';
export const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com';

/**
 * @param {unknown} source
 * @returns {boolean}
 */
export function isOpenAiCompatibleCustomSource(source) {
  return String(source ?? '').toLowerCase() === OPENAI_COMPATIBLE_CUSTOM_SOURCE;
}

/**
 * DeepSeek's official OpenAI-compatible endpoint requires `prefix: true` for
 * assistant prefill. The user requirement is substring-based so `/v1` and other
 * suffixes keep working.
 *
 * @param {unknown} baseUrl
 * @returns {boolean}
 */
export function isDeepSeekApiBaseUrl(baseUrl) {
  return String(baseUrl ?? '').trim().toLowerCase().includes(DEEPSEEK_API_BASE_URL);
}

/**
 * @param {unknown} completion
 * @returns {string}
 */
export function resolveCustomBaseUrl(completion) {
  if (!completion || typeof completion !== 'object') return '';
  return String(
    completion.custom_url ??
    completion.customUrl ??
    completion.base_url ??
    completion.baseUrl ??
    completion.api_url ??
    completion.apiUrl ??
    '',
  );
}

/**
 * @param {unknown} messages
 * @returns {Record<string, unknown> | null}
 */
export function getTrailingMessage(messages) {
  if (!Array.isArray(messages) || !messages.length) return null;
  const message = messages[messages.length - 1];
  return message && typeof message === 'object' ? message : null;
}

/**
 * @param {unknown} message
 * @returns {boolean}
 */
export function isAssistantPrefillMessage(message) {
  return Boolean(
    message &&
    typeof message === 'object' &&
    String(message.role ?? '').toLowerCase() === 'assistant',
  );
}

/**
 * @param {unknown} completion
 * @returns {boolean}
 */
export function shouldApplyDeepSeekAssistantPrefix(completion) {
  if (!completion || typeof completion !== 'object') return false;

  return (
    isOpenAiCompatibleCustomSource(completion.chat_completion_source) &&
    isDeepSeekApiBaseUrl(resolveCustomBaseUrl(completion)) &&
    isAssistantPrefillMessage(getTrailingMessage(completion.messages))
  );
}

/**
 * Mutates the outgoing SillyTavern request payload when the DeepSeek assistant
 * prefill contract applies.
 *
 * @param {unknown} completion
 * @returns {boolean} true when the DeepSeek prefix policy matched
 */
export function applyDeepSeekAssistantPrefix(completion) {
  if (!shouldApplyDeepSeekAssistantPrefix(completion)) return false;

  const trailingMessage = getTrailingMessage(completion.messages);
  if (!trailingMessage) return false;

  trailingMessage.prefix = true;
  return true;
}
