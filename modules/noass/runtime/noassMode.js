/**
 * @file noass 处理模式判定（供真实发送 completionHandler 与 Dry-Run 复用，避免分支分叉）。
 *
 * 三态语义（与 §三态分支一致）：
 * - `skip`：两个子开关都关，noass 不介入。
 * - `merge`：开启对话合并；世界书是否搬运由合并管线内部按 `config.worldbook.groups` 门控。
 * - `worldbook-only`：关闭合并、仅开启世界书搬运，走 custom-only 独立管线。
 */

/**
 * @typedef {'skip'|'merge'|'worldbook-only'} NoassMode
 */

export const NOASS_MODE = Object.freeze({
  SKIP: 'skip',
  MERGE: 'merge',
  WORLDBOOK_ONLY: 'worldbook-only',
});

/**
 * 依据运行期配置的两个子开关解析 noass 处理模式。
 *
 * @param {{ merge_enabled?: boolean, worldbook_enabled?: boolean }} config 运行期配置
 * @returns {NoassMode}
 */
export function resolveNoassMode(config) {
  if (!config) return NOASS_MODE.SKIP;
  const mergeEnabled = config.merge_enabled !== false;
  const worldbookEnabled = config.worldbook_enabled !== false;

  if (!mergeEnabled && !worldbookEnabled) return NOASS_MODE.SKIP;
  if (mergeEnabled) return NOASS_MODE.MERGE;
  return NOASS_MODE.WORLDBOOK_ONLY;
}
