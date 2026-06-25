function resolveSillyTavernScriptUrl(scriptPath, moduleUrl = import.meta.url) {
  const url = new URL(moduleUrl);
  const marker = '/scripts/extensions/';
  const index = url.pathname.lastIndexOf(marker);
  const normalizedScriptPath = String(scriptPath || '').replace(/^\/+/, '');

  if (index >= 0) {
    const basePath = url.pathname.slice(0, index) || '';
    url.pathname = `${basePath}/scripts/${normalizedScriptPath}`;
    url.search = '';
    url.hash = '';
    return url.href;
  }

  return new URL(`/scripts/${normalizedScriptPath}`, url).href;
}

/**
 * @param {{ moduleUrl?: string }} options
 * @returns {Promise<object>}
 */
export function importOpenAiModule({ moduleUrl = import.meta.url } = {}) {
  return import(resolveSillyTavernScriptUrl('openai.js', moduleUrl));
}

/**
 * @param {object|null|undefined} promptManager
 * @returns {Array}
 */
export function resolveEnabledPrompts(promptManager) {
  try {
    if (typeof promptManager?.getPromptsForCharacter === 'function') {
      return promptManager.getPromptsForCharacter(promptManager.activeCharacter, true);
    }
  } catch (error) {
    console.debug?.('[ST-Archichat][deepseek-prefix] 读取 PromptManager 启用条目失败', error);
  }

  return [];
}

/**
 * @param {{ importOpenAi?: typeof importOpenAiModule }} options
 * @returns {Promise<{ chatCompletionSource: string, customUrl: string, enabledPrompts: Array }>}
 */
export async function resolveDeepSeekPrefixHintState({ importOpenAi = importOpenAiModule } = {}) {
  const openAiModule = await importOpenAi();
  const sourceInput = document.querySelector('#chat_completion_source');
  const urlInput = document.querySelector('#custom_api_url_text');

  return {
    chatCompletionSource: String(sourceInput?.value || openAiModule?.oai_settings?.chat_completion_source || ''),
    customUrl: String(urlInput?.value || openAiModule?.oai_settings?.custom_url || ''),
    enabledPrompts: resolveEnabledPrompts(openAiModule?.promptManager),
  };
}
