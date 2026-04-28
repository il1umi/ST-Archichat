import { buildPrefixedPrompt } from './promptBuilder.js';
import { runPromptPipeline } from './promptPipeline.js';

export function composeClewdPrompt(prefixs, messages, options = {}) {
  const {
    initialPrompt = '',
    claudeMode = true,
    logHandler,
    onInvalidMessage,
    onRegexError,
  } = options;

  if (!messages || messages.length === 0) {
    return { prompt: '', log: '' };
  }

  let prompt = buildPrefixedPrompt(initialPrompt || '', messages, prefixs, onInvalidMessage);

  const pipelineResult = runPromptPipeline(prompt, prefixs, {
    logHandler,
    onRegexError,
  });

  prompt = pipelineResult.prompt;
  if (!claudeMode && prompt) {
    prompt += `\n\n${prefixs.assistant}:`;
  }

  return {
    prompt,
    log: `\n####### Regex:\n${pipelineResult.regexLog}`,
  };
}
