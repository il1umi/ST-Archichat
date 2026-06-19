/**
 * @file 世界书 custom-only 独立搬运管线（application 编排，注入式依赖宿主）。
 *
 * 当用户关闭"对话合并"、仅启用"世界书搬运"时，没有 clewd 合并把多楼层压成一条字符串，
 * 故 before/after/header/memory 这些以"已合并成一条"为基准的锚点无从落地，只有 custom
 * （纯文本标记定位）天然适用。本管线在「消息数组」上完成：克隆 → 注入哨兵 → 跨消息提取 → custom 注入。
 *
 * 关键取舍：提取会把世界书内容从原位剪除，若目标 customKey 不存在则内容将无处安放。
 * 为避免内容丢失，这里先校验 customKey 是否存在，仅对「锚点已存在」的组注入哨兵并搬运；
 * 锚点缺失的组保持世界书在原位不动（独立路径不回退 after，无合并语境意义）。
 */
import {
  cloneMessageArray as defaultCloneMessageArray,
  warnWorldbookIssue as defaultWarn,
  debugWorldbookLog as defaultDebug,
} from '../../wibridge/state.js';
import { injectWorldbookSentinels as defaultInjectWorldbookSentinels } from '../../wibridge/sentinel.js';
import { normalizeWorldbookFragment as defaultNormalizeWorldbookFragment } from '../../wibridge/dispatch.js';
import { extractAndStripSentinelSpan as defaultExtractAndStripSentinelSpan } from '../domain/sentinelSpan.js';
import { placeAtCustomAnchor as defaultPlaceAtCustomAnchor } from '../domain/customAnchorPlacement.js';
import { WORLD_BOOK_ANCHORS } from '../../../state/defaults.js';

/**
 * @typedef {Object} RelocationDiagnostics
 * @property {number} customGroups 命中的 custom 组数量
 * @property {number} skippedNonCustom 因非 custom 锚点被跳过的组数量
 * @property {number} placed 成功搬运的组数量
 * @property {number} anchorMissing 锚点缺失（保持原位）的组数量
 * @property {number} empty 提取到空内容的组数量
 */

/**
 * @typedef {Object} RelocationResult
 * @property {Array<object>} messages 处理后的消息数组（新数组；输入不被修改）
 * @property {boolean} changed 消息是否发生变化
 * @property {RelocationDiagnostics} diagnostics 诊断计数
 */

/**
 * 判断消息数组中是否存在包含指定标记的字符串消息。
 *
 * @param {ReadonlyArray<object>} messages
 * @param {string} key
 * @returns {boolean}
 */
function messagesIncludeKey(messages, key) {
  if (!key) return false;
  return messages.some((message) => typeof message?.content === 'string' && message.content.includes(key));
}

/**
 * 移除首个包含 key 的消息中的该 key（纯函数）。
 *
 * @param {ReadonlyArray<object>} messages
 * @param {string} key
 * @returns {{ messages: Array<object>, changed: boolean }}
 */
function removeFirstKeyOccurrence(messages, key) {
  if (!key) return { messages: messages.slice(), changed: false };
  for (let i = 0; i < messages.length; i++) {
    const content = messages[i]?.content;
    if (typeof content === 'string' && content.includes(key)) {
      const index = content.indexOf(key);
      const next = messages.slice();
      next[i] = { ...messages[i], content: content.slice(0, index) + content.slice(index + key.length) };
      return { messages: next, changed: true };
    }
  }
  return { messages: messages.slice(), changed: false };
}

/**
 * 移除 standalone 搬运后产生的空文本消息，避免向 Chat Completion 发送空 content。
 * 非字符串消息保持原样。
 *
 * @param {ReadonlyArray<object>} messages
 * @returns {{ messages: Array<object>, changed: boolean }}
 */
function removeEmptyStringMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const next = list.filter((message) => {
    if (typeof message?.content !== 'string') return true;
    return message.content.trim().length > 0;
  });
  return { messages: next, changed: next.length !== list.length };
}

/**
 * 执行 custom-only 的世界书独立搬运。
 *
 * @param {object} config 运行期配置（由 buildRuntimeConfig 生成，需含 worldbook.groups / worldbook.snapshot）
 * @param {ReadonlyArray<object>} messages 原始消息数组（不会被修改）
 * @param {object} [deps] 注入式依赖（便于测试）
 * @returns {RelocationResult}
 */
export function relocateWorldbookStandalone(config, messages, deps = {}) {
  const cloneMessageArray = deps.cloneMessageArray || defaultCloneMessageArray;
  const injectWorldbookSentinels = deps.injectWorldbookSentinels || defaultInjectWorldbookSentinels;
  const extractAndStripSentinelSpan = deps.extractAndStripSentinelSpan || defaultExtractAndStripSentinelSpan;
  const placeAtCustomAnchor = deps.placeAtCustomAnchor || defaultPlaceAtCustomAnchor;
  const normalizeWorldbookFragment = deps.normalizeWorldbookFragment || defaultNormalizeWorldbookFragment;
  const warn = deps.warn || defaultWarn;
  const debug = deps.debug || defaultDebug;

  const source = Array.isArray(messages) ? messages : [];
  const groups = config?.worldbook?.groups;
  const snapshot = config?.worldbook?.snapshot;

  /** @type {RelocationDiagnostics} */
  const diagnostics = { customGroups: 0, skippedNonCustom: 0, placed: 0, anchorMissing: 0, empty: 0 };

  if (!Array.isArray(groups) || !groups.length || !snapshot?.entriesByDepth) {
    return { messages: source.slice(), changed: false, diagnostics };
  }

  const customGroups = groups.filter((group) => {
    if (!group || typeof group !== 'object') return false;
    if (group.target?.anchor === WORLD_BOOK_ANCHORS.CUSTOM) return true;
    diagnostics.skippedNonCustom += 1;
    warn('standalone relocation skips non-custom group', {
      group: group.id,
      anchor: group.target?.anchor,
    });
    return false;
  });
  diagnostics.customGroups = customGroups.length;

  if (!customGroups.length) {
    return { messages: source.slice(), changed: false, diagnostics };
  }

  let working = cloneMessageArray(source);
  let changed = false;

  for (const group of customGroups) {
    const key = (group.target?.customKey || '').trim();
    if (!key || !messagesIncludeKey(working, key)) {
      diagnostics.anchorMissing += 1;
      warn('standalone custom anchor not found; keep worldbook in place', {
        group: group.id,
        customKey: key,
      });
      continue;
    }

    const beforeGroup = cloneMessageArray(working);
    injectWorldbookSentinels({ worldbook: { groups: [group], snapshot } }, working);

    const prefix = group.sentinel?.prefix;
    if (!prefix) {
      working = beforeGroup;
      continue;
    }

    const beginMarker = `${prefix}BEGIN`;
    const endMarker = `${prefix}END`;
    const extraction = extractAndStripSentinelSpan(working, beginMarker, endMarker);

    if (extraction.status !== 'extracted') {
      if (extraction.status === 'unclosed') {
        warn('standalone worldbook span unclosed', { group: group.id });
      }
      working = beforeGroup;
      if (group.clean_orphan_anchor === true) {
        const removed = removeFirstKeyOccurrence(working, key);
        if (removed.changed) {
          working = removed.messages;
          changed = true;
        }
      }
      continue;
    }

    const payload = normalizeWorldbookFragment(extraction.payload);
    if (!payload) {
      diagnostics.empty += 1;
      working = beforeGroup;
      if (group.clean_orphan_anchor === true) {
        const removed = removeFirstKeyOccurrence(working, key);
        if (removed.changed) {
          working = removed.messages;
          changed = true;
        }
      }
      continue;
    }

    const placement = placeAtCustomAnchor(extraction.messages, payload, key);

    if (placement.status === 'placed') {
      working = placement.messages;
      changed = true;
      diagnostics.placed += 1;
      if (group.sentinel) group.sentinel.moved = true;
      debug('standalone relocated worldbook group', { group: group.id, customKey: key });
      continue;
    }

    working = beforeGroup;
    diagnostics.anchorMissing += 1;
    warn('standalone placement failed after extraction; restored original worldbook span', {
      group: group.id,
      status: placement.status,
    });
  }

  if (changed) {
    const compacted = removeEmptyStringMessages(working);
    working = compacted.messages;
  }

  return { messages: working, changed, diagnostics };
}
