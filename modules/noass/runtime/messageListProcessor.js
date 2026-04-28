import { addPreservedMessage } from './preservedMessageProcessor.js';
import {
  contentHasNoTrans,
  cloneMessage,
  stripNoTransFromMessage,
  createMergeMessage,
  isMultimodalMessage,
  isEmptyContent,
} from './messageBoundary.js';

export function processMessageList(template, config, messages, processMergeBlock) {
  const finalMessages = [];
  let currentMergeBlock = [];
  let storedChanged = false;

  const flushMergeBlock = () => {
    if (!currentMergeBlock.length) return;
    storedChanged =
      processMergeBlock(template, config, currentMergeBlock, finalMessages) ||
      storedChanged;
    currentMergeBlock = [];
  };

  for (const message of messages) {
    if (contentHasNoTrans(message?.content)) {
      flushMergeBlock();
      addPreservedMessage(config, template, stripNoTransFromMessage(message), finalMessages);
      continue;
    }

    if (isMultimodalMessage(message)) {
      flushMergeBlock();
      addPreservedMessage(config, template, cloneMessage(message), finalMessages);
      continue;
    }

    const mergeMessage = createMergeMessage(message);
    if (mergeMessage && !isEmptyContent(mergeMessage.content)) {
      currentMergeBlock.push(mergeMessage);
    }
  }

  flushMergeBlock();
  return { finalMessages, storedChanged };
}
