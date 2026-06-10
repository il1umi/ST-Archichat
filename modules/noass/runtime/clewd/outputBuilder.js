import { buildRoleStartLookaheadPattern } from './prefixUtils.js';

function decodeSeparator(rawSeparator, onSeparatorError = null) {
  if (!rawSeparator) return '';
  try {
    return JSON.parse(`"${rawSeparator}"`);
  } catch (error) {
    if (typeof onSeparatorError === 'function') {
      onSeparatorError(error);
    }
    return '';
  }
}

function applyTurnSeparator(prompt, separator, prefixs) {
  if (typeof prompt !== 'string' || !prompt) return '';
  const splitPattern = buildRoleStartLookaheadPattern(prefixs, ['assistant', 'user']);
  if (!splitPattern) return prompt;
  return prompt.split(splitPattern).join(`\n${separator}\n`);
}

function extractFinalFilePrompt(prompt) {
  const youPrompt = prompt.split(/\s*\[-youFileTag-\]\s*/);
  return youPrompt.length > 0 ? youPrompt.pop().trim() : '';
}

export function buildAssistantOutput(prompt, prefixs, onSeparatorError = null) {
  const separator = decodeSeparator(prefixs.separator, onSeparatorError);
  const filePrompt = extractFinalFilePrompt(prompt);
  return {
    role: 'assistant',
    content: applyTurnSeparator(filePrompt, separator, prefixs),
  };
}
