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
import { relocateWorldbookStandalone } from './worldbook/application/relocateWorldbookStandalone.js';
import { resolveNoassMode, NOASS_MODE } from './noassMode.js';

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

  const mode = resolveNoassMode(config);

  // 两个子开关都关：不介入（快照已记账，仅用于 Dry-Run 等查看）
  if (mode === NOASS_MODE.SKIP) {
    return;
  }

  // 仅启用世界书搬运（关闭对话合并）：走 custom-only 独立管线，不做合并/捕获/标签替换
  if (mode === NOASS_MODE.WORLDBOOK_ONLY) {
    const { messages: relocatedMessages, changed } = relocateWorldbookStandalone(config, originalMessages);
    if (changed) {
      completion.messages = relocatedMessages;
    }
    return;
  }

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
