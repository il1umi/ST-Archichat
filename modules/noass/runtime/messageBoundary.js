import { NO_TRANS_TAG } from '../state/defaults.js';

/**
 * 判断消息内容是否包含 NO_TRANS_TAG，兼容字符串与多模态数组（{type:'text', text:'...'}）
 * @param {string|Array<any>} content
 * @returns {boolean}
 */
export function contentHasNoTrans(content) {
  if (typeof content === 'string') {
    return content.indexOf(NO_TRANS_TAG) !== -1;
  }
  if (Array.isArray(content)) {
    return content.some((part) => part && typeof part.text === 'string' && part.text.indexOf(NO_TRANS_TAG) !== -1);
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    // 兼容单对象形态：{ type: 'text', text: '...' }
    return content.text.indexOf(NO_TRANS_TAG) !== -1;
  }
  return false;
}

/**
 * 从内容中移除 NO_TRANS_TAG；字符串直接替换，数组则替换各 text，空白项会被剔除
 * @param {string|Array<any>} content
 * @returns {string|Array<any>}
 */
function stripNoTrans(content) {
  if (typeof content === 'string') {
    return content.split(NO_TRANS_TAG).join('').trim();
  }
  if (Array.isArray(content)) {
    const next = [];
    for (const part of content) {
      if (part && typeof part.text === 'string') {
        const t = part.text.split(NO_TRANS_TAG).join('').trim();
        if (t) {
          next.push({ ...part, text: t });
        }
      } else if (part != null) {
        next.push(part);
      }
    }
    return next;
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    // 兼容单对象形态：{ type: 'text', text: '...' }
    const t = content.text.split(NO_TRANS_TAG).join('').trim();
    return t ? { ...content, text: t } : '';
  }
  return content;
}

export function cloneMessage(message) {
  if (!message || typeof message !== 'object') return {};
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(message);
    }
  } catch {
    // Fall through to JSON/shallow clone.
  }
  try {
    return JSON.parse(JSON.stringify(message));
  } catch {
    return { ...message };
  }
}

export function cloneMessageWithContent(message, content) {
  const cloned = cloneMessage(message);
  cloned.content = content;
  return cloned;
}

export function stripNoTransFromMessage(message) {
  return cloneMessageWithContent(message, stripNoTrans(message?.content));
}

function isTextPart(part) {
  if (!part || typeof part !== 'object') return false;
  if (typeof part.text !== 'string') return false;
  const type = typeof part.type === 'string' ? part.type.toLowerCase() : '';
  return !type || type === 'text' || type === 'input_text';
}

function getMergeableTextContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    if (!content.length || !content.every(isTextPart)) return null;
    return content.map((part) => part.text).join('\n\n');
  }
  if (isTextPart(content)) {
    return content.text;
  }
  return null;
}

export function createMergeMessage(message) {
  const text = getMergeableTextContent(message?.content);
  if (text == null) return null;
  return cloneMessageWithContent(message, text);
}

export function isMultimodalMessage(message) {
  if (!message || typeof message !== 'object') return false;
  if (message.content == null) return false;
  return getMergeableTextContent(message.content) == null;
}

function messageHasToolCall(message) {
  if (!message || typeof message !== 'object') return false;
  if (String(message.role || '').toLowerCase() === 'tool') return true;
  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) return true;
  if (message.tool_calls && !Array.isArray(message.tool_calls)) return true;
  return typeof message.tool_call_id === 'string' && message.tool_call_id.trim().length > 0;
}

export function messagesHaveToolCalls(messages) {
  return Array.isArray(messages) && messages.some(messageHasToolCall);
}

/**
 * 判断内容是否为空（字符串全空白，或数组中没有非空白 text）
 * @param {string|Array<any>} content
 * @returns {boolean}
 */
export function isEmptyContent(content) {
  if (typeof content === 'string') {
    return content.trim().length === 0;
  }
  if (Array.isArray(content)) {
    return content.every((part) => {
      if (part == null) return true;
      if (typeof part === 'string') return part.trim().length === 0;
      if (isTextPart(part)) return part.text.trim().length === 0;
      if (typeof part.text === 'string' && part.text.trim().length > 0) return false;
      // Non-text parts such as images or videos are meaningful content.
      return !(typeof part === 'object');
    });
  }
  return !content;
}
