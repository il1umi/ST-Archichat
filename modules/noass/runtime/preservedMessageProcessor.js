import { replaceTagsWithStoredData } from './capture/capture.js';
import {
  cloneMessageWithContent,
  isEmptyContent,
} from './messageBoundary.js';

export function addPreservedMessage(config, template, message, targetArray) {
  if (!message || typeof message !== 'object') return;
  if (isEmptyContent(message.content)) return;
  if (typeof message.content === 'string') {
    processPreservedSystemMessage(config, template, message, targetArray);
  } else {
    targetArray.push(message);
  }
}

/**
 * 在不破坏原顺序的前提下处理保留消息，将system片段拆分并执行占位符替换。
 *
 * @param {object} config 运行时配置
 * @param {object} template 当前模板
 * @param {{ role: string, content: string, name?: string }} message 原始消息
 * @param {Array} targetArray 输出消息数组
 */
export function processPreservedSystemMessage(config, template, message, targetArray) {
  let systemMessage = null;
  let remainingContent = message.content;

  if (config.separator_system && message.role === 'system') {
    const systemIndex = remainingContent.indexOf(config.separator_system);
    if (systemIndex > 0) {
      const systemContent = remainingContent.slice(0, systemIndex + config.separator_system.length);
      remainingContent = remainingContent.slice(systemIndex + config.separator_system.length).trim();
      systemMessage = { role: 'system', content: systemContent };
    }
  }

  if (systemMessage) {
    targetArray.push(systemMessage);
  }

  if (remainingContent) {
    const replaced = replaceTagsWithStoredData(remainingContent, template, config.clean_clewd);
    const preservedMessage = cloneMessageWithContent(message, replaced);
    targetArray.push(preservedMessage);
  } else if (!systemMessage) {
    targetArray.push(message);
  }
}
