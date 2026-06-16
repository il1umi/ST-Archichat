import { formatPromptSegmentPrefix, resolveRolePrefix } from './prefixUtils.js';

function normalizeMessageRole(role) {
  const normalizedRole = role || 'user';
  return ['user', 'assistant', 'system'].includes(normalizedRole) ? normalizedRole : 'assistant';
}

function createPromptSegment(message, prefixs) {
  const role = normalizeMessageRole(message.role);
  const prefixLookup = resolveRolePrefix(prefixs, role);
  const prefix = formatPromptSegmentPrefix(prefixLookup);
  const content = typeof message.content === 'string'
    ? message.content.trim()
    : String(message.content).trim();
  return prefix + content;
}

export function buildPrefixedPrompt(initialPrompt, messages, prefixs, onInvalidMessage = null) {
  let prompt = initialPrompt || '';

  for (const message of messages) {
    if (message && message.content) {
      prompt += createPromptSegment(message, prefixs);
    } else if (typeof onInvalidMessage === 'function') {
      onInvalidMessage(message);
    }
  }

  return prompt;
}
