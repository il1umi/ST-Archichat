import { defaultTemplate } from '../state/defaults.js';
import { ensureTemplateDefaults, cloneTemplate } from '../state/state.js';
import { getLastCompletionSnapshot } from './completionSession.js';
import { processAndAddMergeBlock } from './mergeBlockProcessor.js';
import { processMessageList } from './messageListProcessor.js';
import { buildRuntimeConfig } from './runtimeConfig.js';
import { messagesHaveToolCalls } from './messageBoundary.js';
import { relocateWorldbookStandalone } from './worldbook/application/relocateWorldbookStandalone.js';
import { resolveNoassMode, NOASS_MODE } from './noassMode.js';
import {
  createDryRunContext,
  finalizeDryRunContext,
  cloneMessageArray,
  getWorldbookLogAdapter,
} from './wibridge/state.js';

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
  let standaloneDiagnostics = null;
  let runError = null;

  try {
    if (messagesHaveToolCalls(messagesClone)) {
      logAdapter.append('Dry Run 跳过：检测到工具调用消息，本轮 noass 不会处理。', null, { force: true });
      return;
    }

    const mode = resolveNoassMode(config);

    if (mode === NOASS_MODE.SKIP) {
      logAdapter.append('Dry Run 跳过：对话合并与世界书搬运均已关闭。', null, { force: true });
      return;
    }

    if (mode === NOASS_MODE.MERGE) {
      createDryRunContext();
      ({ finalMessages, storedChanged } = processMessageList(
        templateClone,
        config,
        messagesClone,
        processAndAddMergeBlock,
      ));
      dryRunResult = finalizeDryRunContext();
    } else {
      createDryRunContext();
      const standaloneResult = relocateWorldbookStandalone(config, messagesClone);
      finalMessages = standaloneResult.messages;
      standaloneDiagnostics = standaloneResult.diagnostics;
      dryRunResult = finalizeDryRunContext();
    }
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

  if (standaloneDiagnostics) {
    logAdapter.append('独立世界书搬运诊断', standaloneDiagnostics, { force: true });
  } else if (!groupReports.length) {
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
    const previewTitle = config.merge_enabled ? '合并结果预览' : '独立搬运结果预览';
    logAdapter.append(previewTitle, { messages: preview }, { force: true });
  }

  try {
    (ctx?.toastr || window.toastr || { success: () => {} }).success?.('Dry Run 完成，请查看日志。');
  } catch {
    // ignore
  }
}
