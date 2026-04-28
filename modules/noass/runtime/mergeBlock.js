import { defaultTemplate } from '../state/defaults.js';
import { ensureTemplateDefaults, cloneTemplate } from '../state/state.js';
import { replaceTagsWithStoredData } from './capture/capture.js';
import {
  getLastCompletionSnapshot,
  notifyStoredDataView,
  updateLastCompletionSnapshot,
} from './completionSession.js';
export {
  getLastCompletionSnapshot,
  setRefreshStoredDataView,
} from './completionSession.js';
import { processAndAddMergeBlock } from './mergeBlockProcessor.js';
export { processAndAddMergeBlock } from './mergeBlockProcessor.js';
import { processMessageList } from './messageListProcessor.js';
import { buildRuntimeConfig } from './runtimeConfig.js';
export { processPreservedSystemMessage } from './preservedMessageProcessor.js';
import {
  createDryRunContext,
  finalizeDryRunContext,
  cloneMessageArray,
  summarizeTextForDiagnostics,
  getWorldbookLogAdapter,
} from './wibridge/state.js';
import {
  messagesHaveToolCalls,
} from './messageBoundary.js';

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
    if (typeof ctx?.saveSettingsDebounced === 'function') {
      ctx.saveSettingsDebounced();
    } else if (typeof ctx?.saveSettings === 'function') {
      ctx.saveSettings();
    } else if (typeof window.saveSettingsDebounced === 'function') {
      window.saveSettingsDebounced();
    } else if (typeof window.saveSettings === 'function') {
      window.saveSettings();
    }
    notifyStoredDataView();
  }
}

/**
 * 对最近一次 completion 快照执行 Dry-Run，生成世界书抽取与搬运的详细日志。
 *
 * @param {object} ctx 扩展上下文
 * @returns {Promise<void>}
 */
export async function runWorldbookDryRun(ctx) {
  const logAdapter = getWorldbookLogAdapter();
  if (!logAdapter || typeof logAdapter.reset !== 'function') {
    console.warn('[ST-Archichat][noass] Dry Run log adapter not ready');
    return;
  }

  logAdapter.reset();
  logAdapter.append('Dry Run 开始', { timestamp: new Date().toISOString() }, { force: true });

  const snapshot = getLastCompletionSnapshot();
  if (!snapshot || !Array.isArray(snapshot.messages)) {
    logAdapter.append('Dry Run 失败：暂无可用对话快照', null, { force: true });
    try {
      (ctx?.toastr || window.toastr || { warning: () => {} }).warning?.('暂无可用上下文，请先发送一轮消息。');
    } catch {
      // ignore
    }
    return;
  }

  logAdapter.append('上下文源', { source: snapshot?.source || null }, { force: true });
  const templateClone = ensureTemplateDefaults(cloneTemplate(snapshot.template || defaultTemplate));
  const config = buildRuntimeConfig(templateClone);
  const messagesClone = cloneMessageArray(snapshot.messages || []);
  let storedChanged = false;
  let finalMessages = [];

  const summarizeText = (text, length = 160) => {
    if (typeof text !== 'string') return '';
    return text.length > length ? `${text.slice(0, length)}…` : text;
  };

  let dryRunResult = null;
  let runError = null;

  try {
    if (messagesHaveToolCalls(messagesClone)) {
      logAdapter.append('Dry Run 跳过：检测到工具调用消息，本轮 noass 不会处理。', null, { force: true });
      return;
    }

    createDryRunContext();
    ({ finalMessages, storedChanged } = processMessageList(
      templateClone,
      config,
      messagesClone,
      processAndAddMergeBlock,
    ));
    dryRunResult = finalizeDryRunContext();
  } catch (error) {
    runError = error;
    if (typeof finalizeDryRunContext === 'function') {
      dryRunResult = finalizeDryRunContext();
    }
    console.error('[ST-Archichat][noass] Dry Run 执行失败', error);
    try {
      logAdapter.append(
        'Dry Run 异常',
        {
          message: error?.message || String(error),
          stack: error?.stack || null,
        },
        { force: true },
      );
    } catch (logError) {
      console.warn('[ST-Archichat][noass] Dry Run 错误日志写入失败', logError);
    }
  }

  const warnings = Array.isArray(dryRunResult?.warnings) ? dryRunResult.warnings : [];
  const groupReports =
    dryRunResult?.context?.groups instanceof Map ? Array.from(dryRunResult.context.groups.values()) : [];

  if (runError) {
    logAdapter.append(
      'Dry Run 失败',
      { error: runError?.message || String(runError), warnings: warnings.length },
      { force: true },
    );
    try {
      (ctx?.toastr || window.toastr || { error: () => {} }).error?.('Dry Run 执行失败，请查看控制台日志。');
    } catch {
      // ignore
    }
    return;
  }

  logAdapter.append(
    'Dry Run 完成',
    {
      groups: groupReports.length,
      warnings: warnings.length,
      storedChanged: storedChanged === true,
    },
    { force: true },
  );

  if (!groupReports.length) {
    logAdapter.append('未命中任何启用的世界书条目', null, { force: true });
  } else {
    groupReports.forEach((report) => {
      const depths = (report.depths || []).map((item) => ({ depth: item.depth, count: item.count }));
      const dispatchSummary = {};
      Object.entries(report.dispatch || {}).forEach(([anchor, payloads]) => {
        if (Array.isArray(payloads) && payloads.length) {
          dispatchSummary[anchor] = {
            count: payloads.length,
            samples: payloads.slice(0, 2).map((payload) =>
              typeof payload === 'string'
                ? summarizeText(payload)
                : `${payload.role || 'unknown'}: ${summarizeText(payload.content || '')}`,
            ),
          };
        }
      });

      const entrySummaries = (report.entries || []).map((entry) => {
        const previewSnippet = entry.preview?.snippet
          ? summarizeText(entry.preview.snippet)
          : null;
        return {
          key: entry.key || null,
          uid: entry.uid,
          comment: entry.comment,
          depth: entry.depth,
          order: entry.order,
          target: entry.targetAnchor,
          role: entry.targetRole,
          status: entry.status || 'pending',
          reason: entry.reason || null,
          preview: entry.preview
            ? {
                location: entry.preview.location || entry.targetAnchor,
                snippet: previewSnippet,
              }
            : null,
        };
      });

      logAdapter.append(
        `组 ${report.label || report.id}`,
        {
          target: report.target,
          depths,
          entries: entrySummaries,
          segmentsPreview: (report.segments || []).slice(0, 3).map((segment) => summarizeText(segment)),
          dispatch: dispatchSummary,
        },
        { force: true },
      );
    });
  }

  if (warnings.length) {
    warnings.forEach((warning, index) => {
      logAdapter.append(
        `警告 ${index + 1}`,
        { message: warning?.message, context: warning?.context || null },
        { force: true },
      );
    });
  }

  if (finalMessages.length) {
    const preview = finalMessages.map((message, index) => ({
      index,
      role: message?.role,
      preview: summarizeText(message?.content || ''),
    }));
    logAdapter.append('合并结果预览', { messages: preview }, { force: true });
  }

  try {
    (ctx?.toastr || window.toastr || { success: () => {} }).success?.('Dry Run 完成，请查看日志。');
  } catch {
    // ignore
  }
}
