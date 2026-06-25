import { addPreservedMessage } from './preservedMessageProcessor.js';
import {
  contentHasNoTrans,
  cloneMessage,
  cloneMessageWithContent,
  stripNoTransFromMessage,
  createMergeMessage,
  isMultimodalMessage,
  isEmptyContent,
} from './messageBoundary.js';

function isAssistantMessage(message) {
  return String(message?.role || '').toLowerCase() === 'assistant';
}

function shouldPreserveSingleUserAssistantTail(config, message) {
  return !!config?.single_user && isAssistantMessage(message) && isEmptyContent(message.content);
}

function collectAssistantTailAfterNoTransMarker(messages, startIndex, markerMessage) {
  const preservedParts = [];
  let nextIndex = startIndex;

  for (; nextIndex < messages.length; nextIndex += 1) {
    const sourceMessage = messages[nextIndex];
    if (!isAssistantMessage(sourceMessage)) break;
    if (isMultimodalMessage(sourceMessage)) break;

    const candidate = contentHasNoTrans(sourceMessage?.content)
      ? stripNoTransFromMessage(sourceMessage)
      : sourceMessage;
    const mergeMessage = createMergeMessage(candidate);

    if (!mergeMessage || isEmptyContent(mergeMessage.content)) {
      if (contentHasNoTrans(sourceMessage?.content)) continue;
      break;
    }

    preservedParts.push(mergeMessage);
  }

  if (!preservedParts.length) {
    return { preservedMessage: null, nextIndex: startIndex };
  }

  const content = preservedParts
    .map((message) => message.content)
    .filter((contentPart) => !isEmptyContent(contentPart))
    .join('\n\n');

  return {
    preservedMessage: cloneMessageWithContent(markerMessage, content),
    nextIndex,
  };
}

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

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];

    if (contentHasNoTrans(message?.content)) {
      flushMergeBlock();
      const preservedMessage = stripNoTransFromMessage(message);

      if (shouldPreserveSingleUserAssistantTail(config, preservedMessage)) {
        const assistantTail = collectAssistantTailAfterNoTransMarker(
          messages,
          index + 1,
          preservedMessage,
        );

        if (assistantTail.preservedMessage) {
          addPreservedMessage(config, template, assistantTail.preservedMessage, finalMessages);
          index = assistantTail.nextIndex - 1;
          continue;
        }
      }

      addPreservedMessage(config, template, preservedMessage, finalMessages);
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
