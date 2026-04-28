import {
  getWorldbookLogAdapter,
  summarizeTextForDiagnostics,
} from './wibridge/state.js';

export function createClewdProcessOptions(template, logAdapter = getWorldbookLogAdapter()) {
  const shouldLogRegex =
    template?.debug_worldbook === true && logAdapter && typeof logAdapter.append === 'function';

  if (!shouldLogRegex) return undefined;

  return {
    logHandler: (event, payload = {}) => {
      if (event !== 'hyperRegex:match') return;
      try {
        const order = Number.isFinite(payload.order) ? payload.order : null;
        let preview = summarizeTextForDiagnostics(payload.match || '', 160);
        if (!preview && typeof payload.match === 'string') {
          preview = payload.match.slice(0, 160);
        }
        if (!preview) return;
        const info = order !== null ? { order, preview } : { preview };
        logAdapter.append('clewd 正则命中', info);
      } catch {
        // 忽略日志写入失败，避免影响主流程
      }
    },
  };
}
