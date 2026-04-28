import { captureAndStoreData } from './capture/capture.js';

function combineStringContent(blockToMerge) {
  let combinedContent = '';
  for (const message of blockToMerge) {
    if (message?.content && typeof message.content === 'string') {
      combinedContent += (combinedContent ? '\n\n' : '') + message.content;
    }
  }
  return combinedContent;
}

export function captureMergeBlockData(template, config, blockToMerge) {
  if (!config.capture_enabled || !config.capture_rules?.length) {
    return false;
  }

  const combinedContent = combineStringContent(blockToMerge);
  if (!combinedContent) {
    return false;
  }

  return captureAndStoreData(template, combinedContent);
}
