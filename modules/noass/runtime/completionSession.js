import { cloneTemplate } from '../state/state.js';
import { cloneMessageArray } from './wibridge/state.js';

let refreshStoredDataView = null;
let lastCompletionSnapshot = null;

/**
 * 注入 UI 层提供的存储数据刷新回调。
 *
 * @param {(() => void) | null | undefined} callback 当捕获内容变化时触发的刷新函数
 */
export function setRefreshStoredDataView(callback) {
  refreshStoredDataView = typeof callback === 'function' ? callback : null;
}

export function notifyStoredDataView() {
  refreshStoredDataView?.();
}

/**
 * 获取最近一次 completion 触发时的快照，用于 Dry-Run 或调试。
 *
 * @returns {{ templateName: string, template: object, messages: Array, timestamp: number } | null}
 */
export function getLastCompletionSnapshot() {
  return lastCompletionSnapshot;
}

export function updateLastCompletionSnapshot(state, template, messages, completion, skippedReason = null) {
  lastCompletionSnapshot = {
    templateName: state.active,
    template: cloneTemplate(template),
    messages: cloneMessageArray(messages),
    timestamp: Date.now(),
    source: completion?.chat_completion_source ?? null,
    skippedReason,
  };
}
