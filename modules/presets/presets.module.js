import { patchPromptManager } from './adapters/promptManagerPatch.js';
import { waitForPromptManager } from './adapters/sillyTavernImports.js';

let cleanupPromptManagerPatch = null;
let panelElement = null;

function resolveExtensionRootName(fallback = 'third-party/ST-Archichat') {
  try {
    const url = new URL(import.meta.url);
    const marker = '/scripts/extensions/';
    const pathname = String(url.pathname || '');
    const index = pathname.lastIndexOf(marker);
    if (index < 0) return fallback;

    const relative = pathname.slice(index + marker.length).replace(/^\/+/, '');
    const parts = relative.split('/').filter(Boolean);
    if (parts[0] === 'third-party' && parts[1]) return `third-party/${parts[1]}`;
    if (parts[0]) return parts[0];
  } catch {}

  return fallback;
}

async function mountPanel(ctx, jQuery = globalThis.$) {
  if (!ctx?.renderExtensionTemplateAsync || typeof jQuery !== 'function') return;
  if (panelElement) return;

  const extRoot = resolveExtensionRootName();
  const html = await ctx.renderExtensionTemplateAsync(`${extRoot}/modules/presets`, 'panel');
  const $element = jQuery(html).hide();
  jQuery('body').append($element);
  panelElement = $element;
}

function unmountPanel() {
  try {
    panelElement?.remove?.();
  } catch {}

  panelElement = null;
}

export async function mount(ctx, {
  waitForPromptManager: waitForPromptManagerDep = waitForPromptManager,
  patchPromptManager: patchPromptManagerDep = patchPromptManager,
  jQuery = globalThis.$,
} = {}) {
  try {
    await mountPanel(ctx, jQuery);
  } catch (error) {
    console.warn('[ST-Archichat][presets] panel mount failed', error);
  }

  try {
    if (typeof cleanupPromptManagerPatch === 'function') cleanupPromptManagerPatch();

    const promptManager = await waitForPromptManagerDep();
    if (!promptManager) {
      console.warn('[ST-Archichat][presets] promptManager not ready; keyword activation skipped');
      cleanupPromptManagerPatch = null;
      return;
    }

    cleanupPromptManagerPatch = patchPromptManagerDep(promptManager);
  } catch (error) {
    cleanupPromptManagerPatch = null;
    console.warn('[ST-Archichat][presets] promptManager patch failed', error);
  }
}

export async function unmount() {
  try {
    if (typeof cleanupPromptManagerPatch === 'function') cleanupPromptManagerPatch();
  } catch (error) {
    console.warn('[ST-Archichat][presets] promptManager patch cleanup failed', error);
  } finally {
    cleanupPromptManagerPatch = null;
  }

  unmountPanel();
}
