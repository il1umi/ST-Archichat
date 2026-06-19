/**
 * @file 世界书 custom 锚点放置（domain 纯函数，无宿主依赖）。
 *
 * 在消息数组中定位首个包含 `customKey` 的消息，把该标记替换为世界书 payload。
 * 与合并路径 dispatch.js 的 CUSTOM 分支语义一致，但作用粒度为「消息数组」而非「单条合并字符串」，
 * 故本期独立实现、不修改 dispatch.js。函数为纯函数：不修改输入，返回新数组。
 */

/**
 * @typedef {'placed'|'anchor-missing'|'empty-payload'|'empty-anchor'} CustomAnchorStatus
 */

/**
 * @typedef {Object} CustomAnchorPlacementResult
 * @property {CustomAnchorStatus} status 放置结果状态
 * @property {Array<object>} messages 处理后的消息数组（新数组；输入不被修改）
 * @property {number} messageIndex 命中的消息下标；未命中为 -1
 */

/**
 * 在单段文本中把首个 needle 替换为 replacement。
 *
 * @param {string} content
 * @param {string} needle
 * @param {string} replacement
 * @returns {string}
 */
function replaceFirstOccurrence(content, needle, replacement) {
  const index = content.indexOf(needle);
  if (index === -1) return content;
  return `${content.slice(0, index)}${replacement}${content.slice(index + needle.length)}`;
}

/**
 * 查找首个 content 为字符串且包含 customKey 的消息下标。
 *
 * @param {ReadonlyArray<object>} messages
 * @param {string} customKey
 * @returns {number} 命中下标；未命中为 -1
 */
function findFirstAnchorIndex(messages, customKey) {
  for (let i = 0; i < messages.length; i++) {
    const content = messages[i]?.content;
    if (typeof content === 'string' && content.includes(customKey)) {
      return i;
    }
  }
  return -1;
}

/**
 * 将世界书 payload 放置到消息数组中首个 custom 标记处。
 *
 * @param {ReadonlyArray<object>} messages 原始消息数组（不会被修改）
 * @param {string} payload 世界书内容
 * @param {string} customKey 自定义标记串
 * @returns {CustomAnchorPlacementResult}
 */
export function placeAtCustomAnchor(messages, payload, customKey) {
  const list = Array.isArray(messages) ? messages : [];
  const key = typeof customKey === 'string' ? customKey.trim() : '';
  const text = typeof payload === 'string' ? payload : '';

  if (!key) {
    return { status: 'empty-anchor', messages: list.slice(), messageIndex: -1 };
  }
  if (!text.trim()) {
    return { status: 'empty-payload', messages: list.slice(), messageIndex: -1 };
  }

  const messageIndex = findFirstAnchorIndex(list, key);
  if (messageIndex === -1) {
    return { status: 'anchor-missing', messages: list.slice(), messageIndex: -1 };
  }

  const next = list.slice();
  const target = next[messageIndex];
  next[messageIndex] = {
    ...target,
    content: replaceFirstOccurrence(target.content, key, text),
  };

  return { status: 'placed', messages: next, messageIndex };
}
