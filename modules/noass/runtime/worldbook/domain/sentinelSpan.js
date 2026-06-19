/**
 * @file 世界书哨兵跨消息提取（domain 纯函数，无宿主依赖）。
 *
 * 合并路径下，clewd 会把多条消息压成一条字符串，故 `BEGIN..END` 哨兵段始终落在同一字符串内、
 * 用正则即可提取。独立搬运路径不做合并，`BEGIN` 与 `END` 可能分散在不同消息里，
 * 因此需要本函数在「消息数组」上跨消息定位、提取并原位剪除该段。函数为纯函数：不修改输入，返回新数组。
 */

/**
 * @typedef {'extracted'|'not-found'|'unclosed'} SpanExtractionStatus
 */

/**
 * @typedef {Object} SpanExtractionResult
 * @property {SpanExtractionStatus} status 提取结果状态
 * @property {Array<object>} messages 剪除哨兵段后的消息数组（新数组；输入不被修改）
 * @property {string} payload 提取出的世界书原文（跨消息时以换行连接各段）
 * @property {{ beginIndex: number, endIndex: number }|null} span 命中的首尾消息下标；未命中为 null
 */

/**
 * 在消息数组中跨消息提取 `beginMarker..endMarker` 段，并原位剪除。
 *
 * - 单消息：剪除 `begin 前 + end 后` 之外的整段（含两个标记）。
 * - 跨消息：首消息保留 `begin` 之前、尾消息保留 `end` 之后，中间整条消息被移除。
 * - 未闭合（有 begin 无 end）：清除孤立的 begin 标记，payload 为空，状态 `unclosed`。
 * - 无 begin 标记：原样返回，状态 `not-found`。
 *
 * @param {ReadonlyArray<object>} messages 原始消息数组（不会被修改）
 * @param {string} beginMarker 段起始标记
 * @param {string} endMarker 段结束标记
 * @returns {SpanExtractionResult}
 */
export function extractAndStripSentinelSpan(messages, beginMarker, endMarker) {
  const list = Array.isArray(messages) ? messages : [];

  if (!beginMarker || !endMarker) {
    return { status: 'not-found', messages: list.slice(), payload: '', span: null };
  }

  let beginIndex = -1;
  let beginPos = -1;
  for (let i = 0; i < list.length; i++) {
    const content = list[i]?.content;
    if (typeof content !== 'string') continue;
    const pos = content.indexOf(beginMarker);
    if (pos !== -1) {
      beginIndex = i;
      beginPos = pos;
      break;
    }
  }

  if (beginIndex === -1) {
    return { status: 'not-found', messages: list.slice(), payload: '', span: null };
  }

  let endIndex = -1;
  let endPos = -1;
  for (let j = beginIndex; j < list.length; j++) {
    const content = list[j]?.content;
    if (typeof content !== 'string') continue;
    const searchFrom = j === beginIndex ? beginPos + beginMarker.length : 0;
    const pos = content.indexOf(endMarker, searchFrom);
    if (pos !== -1) {
      endIndex = j;
      endPos = pos;
      break;
    }
  }

  const next = list.slice();

  if (endIndex === -1) {
    const content = next[beginIndex].content;
    next[beginIndex] = {
      ...next[beginIndex],
      content: content.slice(0, beginPos) + content.slice(beginPos + beginMarker.length),
    };
    return { status: 'unclosed', messages: next, payload: '', span: { beginIndex, endIndex: -1 } };
  }

  if (beginIndex === endIndex) {
    const content = next[beginIndex].content;
    const innerStart = beginPos + beginMarker.length;
    const payload = content.slice(innerStart, endPos);
    next[beginIndex] = {
      ...next[beginIndex],
      content: content.slice(0, beginPos) + content.slice(endPos + endMarker.length),
    };
    return { status: 'extracted', messages: next, payload, span: { beginIndex, endIndex } };
  }

  const firstContent = next[beginIndex].content;
  const lastContent = next[endIndex].content;

  const parts = [firstContent.slice(beginPos + beginMarker.length)];
  for (let k = beginIndex + 1; k < endIndex; k++) {
    const middle = next[k]?.content;
    parts.push(typeof middle === 'string' ? middle : '');
  }
  parts.push(lastContent.slice(0, endPos));
  const payload = parts.join('\n');

  next[beginIndex] = { ...next[beginIndex], content: firstContent.slice(0, beginPos) };
  next[endIndex] = { ...next[endIndex], content: lastContent.slice(endPos + endMarker.length) };

  const removeCount = endIndex - beginIndex - 1;
  if (removeCount > 0) {
    next.splice(beginIndex + 1, removeCount);
  }

  return { status: 'extracted', messages: next, payload, span: { beginIndex, endIndex } };
}
