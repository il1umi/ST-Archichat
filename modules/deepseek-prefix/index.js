import {
  registerDeepSeekPrefixCompletion,
  unregisterDeepSeekPrefixCompletion,
} from './runtime/completion.js';
import { mountBaseUrlHint, unmountBaseUrlHint } from './ui/baseUrlHint.js';

let currentCtx = null;

/**
 * @param {object} ctx SillyTavern extension context
 * @returns {Promise<void>}
 */
export async function mount(ctx) {
  currentCtx = ctx;
  registerDeepSeekPrefixCompletion(ctx);
  mountBaseUrlHint();
}

/**
 * @param {object} ctx SillyTavern extension context
 * @returns {Promise<void>}
 */
export async function unmount(ctx = currentCtx) {
  unregisterDeepSeekPrefixCompletion(ctx);
  unmountBaseUrlHint();
  currentCtx = null;
}
