import { ensureTemplateDefaults } from '../state/state.js';
import { replaceTagsWithStoredData } from './capture/capture.js';
import {
  notifyStoredDataView,
  updateLastCompletionSnapshot,
} from './completionSession.js';
import { processAndAddMergeBlock } from './mergeBlockProcessor.js';
import { processMessageList } from './messageListProcessor.js';
import { buildRuntimeConfig } from './runtimeConfig.js';
import { messagesHaveToolCalls } from './messageBoundary.js';

function saveSettings(ctx) {
  if (typeof ctx?.saveSettingsDebounced === 'function') {
    ctx.saveSettingsDebounced();
  } else if (typeof ctx?.saveSettings === 'function') {
    ctx.saveSettings();
  } else if (typeof window.saveSettingsDebounced === 'function') {
    window.saveSettingsDebounced();
  } else if (typeof window.saveSettings === 'function') {
    window.saveSettings();
  }
}

/**
 * completion 事件处理入口：拆分消息块、触发合并流程并回写最终消息。
 *
 * @param {object} ctx 扩展上下文
 * @param {object} state noass 设置状态
 * @param {{ messages: Array }} completion SillyTavern 提供的 completion payload
 */
export function handleCompletion(ctx, state, completion) {
  if (!state || state.enabled === false) return;
  if (!completion?.messages) return;

  const template =
    state.templates[state.active] || state.templates[Object.keys(state.templates)[0]];
  if (!template) return;

  const sanitizedTemplate = ensureTemplateDefaults(template);
  const originalMessages = Array.isArray(completion.messages) ? completion.messages : [];
  if (messagesHaveToolCalls(originalMessages)) {
    updateLastCompletionSnapshot(state, sanitizedTemplate, originalMessages, completion, 'tool_calls');
    try {
      console.debug('[ST-Archichat][noass] 检测到工具调用消息，本轮跳过 noass');
    } catch {
      // ignore
    }
    return;
  }

  const config = buildRuntimeConfig(sanitizedTemplate);
  updateLastCompletionSnapshot(state, sanitizedTemplate, originalMessages, completion);

  const { finalMessages, storedChanged } = processMessageList(
    sanitizedTemplate,
    config,
    originalMessages,
    processAndAddMergeBlock,
  );

  for (let i = 0; i < finalMessages.length; i++) {
    if (finalMessages[i]?.content) {
      const before = finalMessages[i].content;
      finalMessages[i].content = replaceTagsWithStoredData(
        finalMessages[i].content,
        sanitizedTemplate,
        config.clean_clewd,
      );
      if (before !== finalMessages[i].content) {
        try {
          console.debug('[ST-Archichat][noass] 标签替换发生在消息', i);
        } catch {
          // ignore
        }
      }
    }
  }

  completion.messages = finalMessages;

  if (storedChanged) {
    saveSettings(ctx);
    notifyStoredDataView();
  }
}
