function normalizeMessageRole(role) {
  const normalizedRole = role || 'user';
  return ['user', 'assistant', 'system'].includes(normalizedRole) ? normalizedRole : 'assistant';
}

function createPromptSegment(message, prefixs) {
  const role = normalizeMessageRole(message.role);
  const name = message.name;
  const prefixLookup = prefixs[name] || prefixs[role] || role;
  const prefix = `\n\n${prefixLookup}${name ? `: ${name}` : ''}: `;
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
