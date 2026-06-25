import { applyDeepSeekAssistantPrefix } from '../domain/prefixPolicy.js';

let completionHandler = null;
let completionEventName = null;

function resolveCompletionSettingsEventName(ctx) {
  const eventTypes = ctx?.eventTypes || ctx?.event_types || {};
  return (
    eventTypes.CHAT_COMPLETION_SETTINGS_READY ||
    eventTypes.chat_completion_settings_ready ||
    'chat_completion_settings_ready'
  );
}

function addEventListener(eventSource, eventName, handler) {
  if (typeof eventSource?.on === 'function') {
    eventSource.on(eventName, handler);
    return true;
  }
  if (typeof eventSource?.addListener === 'function') {
    eventSource.addListener(eventName, handler);
    return true;
  }
  if (typeof eventSource?.addEventListener === 'function') {
    eventSource.addEventListener(eventName, handler);
    return true;
  }
  return false;
}

function removeEventListener(eventSource, eventName, handler) {
  if (typeof eventSource?.off === 'function') {
    eventSource.off(eventName, handler);
    return;
  }
  if (typeof eventSource?.removeListener === 'function') {
    eventSource.removeListener(eventName, handler);
    return;
  }
  if (typeof eventSource?.removeEventListener === 'function') {
    eventSource.removeEventListener(eventName, handler);
  }
}

/**
 * @param {object} ctx SillyTavern extension context
 * @returns {void}
 */
export function registerDeepSeekPrefixCompletion(ctx) {
  const eventSource = ctx?.eventSource;
  if (!eventSource || completionHandler) return;

  const eventName = resolveCompletionSettingsEventName(ctx);
  completionHandler = (completion) => {
    try {
      const applied = applyDeepSeekAssistantPrefix(completion);
      if (applied) {
        console.debug?.('[ST-Archichat][deepseek-prefix] 已为 DeepSeek assistant prefill 补充 prefix=true');
      }
    } catch (error) {
      console.warn('[ST-Archichat][deepseek-prefix] 处理 completion 时发生异常', error);
    }
  };

  if (!addEventListener(eventSource, eventName, completionHandler)) {
    completionHandler = null;
    return;
  }

  completionEventName = eventName;
}

/**
 * @param {object} ctx SillyTavern extension context
 * @returns {void}
 */
export function unregisterDeepSeekPrefixCompletion(ctx) {
  if (!completionHandler) return;

  const eventSource = ctx?.eventSource;
  if (eventSource && completionEventName) {
    removeEventListener(eventSource, completionEventName, completionHandler);
  }

  completionHandler = null;
  completionEventName = null;
}
