function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveSillyTavernScriptUrl(scriptPath, moduleUrl = import.meta.url) {
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

export async function importOpenAiModule({ moduleUrl = import.meta.url } = {}) {
  return import(resolveSillyTavernScriptUrl('openai.js', moduleUrl));
}

export async function waitForPromptManager({
  importOpenAi = importOpenAiModule,
  delay = sleep,
  maxAttempts = 20,
  intervalMs = 250,
} = {}) {
  const openAiModule = await importOpenAi();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (openAiModule?.promptManager) return openAiModule.promptManager;
    await delay(intervalMs);
  }

  return null;
}
