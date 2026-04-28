import { process } from './clewd/processor.js';
import { createClewdProcessOptions } from './clewdProcessOptions.js';
import { captureMergeBlockData } from './mergeBlockCapture.js';
import { finalizeMergedBlock } from './mergeBlockFinalizer.js';
import { createCustomAnchorProtection } from './worldbookAnchorProtection.js';
import { dispatchWorldbookSegments } from './wibridge/dispatch.js';
import { injectWorldbookSentinels } from './wibridge/sentinel.js';

/**
 * 按 clewd 规则处理一段消息块，执行捕获、世界书提取与标签替换，并将结果推入最终消息数组。
 *
 * @param {object} template 当前激活模板
 * @param {object} config 运行时配置（由 {@link buildRuntimeConfig} 生成）
 * @param {Array} blockToMerge 需要合并的原始消息块
 * @param {Array} targetArray 输出消息数组
 * @returns {boolean} 是否发生了 stored_data 变化
 */
export function processAndAddMergeBlock(template, config, blockToMerge, targetArray) {
  if (!blockToMerge || !blockToMerge.length) {
    return false;
  }

  let storedChanged = captureMergeBlockData(template, config, blockToMerge);

  injectWorldbookSentinels(config, blockToMerge);

  const anchorProtection = createCustomAnchorProtection(config, blockToMerge);

  const processOptions = createClewdProcessOptions(template);

  const mergedAssistantMessage = process(config, anchorProtection.blockForProcess, processOptions);

  if (mergedAssistantMessage?.content) {
    mergedAssistantMessage.content = anchorProtection.restoreContent(mergedAssistantMessage.content);
  }

  const worldbookDispatch = dispatchWorldbookSegments(config, mergedAssistantMessage);

  finalizeMergedBlock(template, config, mergedAssistantMessage, worldbookDispatch, targetArray);

  return storedChanged;
}
