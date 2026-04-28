import { defaultTemplate } from '../state/defaults.js';
import { applyClewdTagTransferRules } from './clewd/tagTransfer.js';
import { replaceTagsWithStoredData } from './capture/capture.js';
import { summarizeTextForDiagnostics } from './wibridge/state.js';

function replaceDispatchTags(messages, template, cleanClewd) {
  if (!Array.isArray(messages)) return;
  for (const message of messages) {
    if (message?.content) {
      message.content = replaceTagsWithStoredData(message.content, template, cleanClewd);
    }
  }
}

export function finalizeMergedBlock(template, config, mergedAssistantMessage, worldbookDispatch, targetArray) {
  if (typeof mergedAssistantMessage?.content === 'string' && mergedAssistantMessage.content) {
    mergedAssistantMessage.content = applyClewdTagTransferRules(
      mergedAssistantMessage.content,
      template?.clewd_tag_transfer_rules,
    );
  }

  if (mergedAssistantMessage?.content) {
    const beforeContent = mergedAssistantMessage.content;
    mergedAssistantMessage.content = replaceTagsWithStoredData(
      mergedAssistantMessage.content,
      template,
      config.clean_clewd,
    );
    if (beforeContent !== mergedAssistantMessage.content) {
      try {
        console.debug('[ST-Archichat][noass] 合并内容发生标签替换');
      } catch {
        // ignore
      }
    }
  }

  replaceDispatchTags(worldbookDispatch?.before, template, config.clean_clewd);
  replaceDispatchTags(worldbookDispatch?.after, template, config.clean_clewd);

  let systemMessage = null;
  if (config.separator_system && mergedAssistantMessage.content) {
    const systemIndex = mergedAssistantMessage.content.indexOf(config.separator_system);
    if (systemIndex > 0) {
      const systemContent = mergedAssistantMessage.content.slice(
        0,
        systemIndex + config.separator_system.length,
      );
      mergedAssistantMessage.content = mergedAssistantMessage.content.slice(
        systemIndex + config.separator_system.length,
      );
      systemMessage = { role: 'system', content: systemContent };
    }
  }

  if (systemMessage) {
    targetArray.push(systemMessage);
  }

  if (worldbookDispatch?.before?.length) {
    for (const message of worldbookDispatch.before) {
      targetArray.push(message);
    }
  }

  const prefill = config.prefill_user || defaultTemplate.prefill_user;
  // 仅在第一次合并块前注入 prefill；之后即便因 NO_TRANS_TAG 产生新块也不再重复注入
  if (config.inject_prefill !== false && prefill && prefill.trim() && !config.__prefillInjected) {
    try {
      console.debug('[ST-Archichat][noass] inject prefill before merged block', {
        inject_prefill: config.inject_prefill !== false,
        has_prefill: !!prefill,
      });
    } catch {}
    targetArray.push({
      role: 'user',
      content: prefill,
    });
    config.__prefillInjected = true;
  }

  const assignedRole = config.single_user ? 'user' : 'assistant';
  mergedAssistantMessage.role = assignedRole;
  try {
    const preview = typeof summarizeTextForDiagnostics === 'function'
      ? summarizeTextForDiagnostics(mergedAssistantMessage.content || '', 80)
      : (mergedAssistantMessage?.content || '').slice(0, 80);
    console.debug('[ST-Archichat][noass] merged block role assigned', {
      single_user: !!config.single_user,
      assignedRole,
      contentPreview: preview,
    });
  } catch {}
  if (mergedAssistantMessage.content && mergedAssistantMessage.content.trim()) {
    targetArray.push(mergedAssistantMessage);
  }

  if (worldbookDispatch?.after?.length) {
    for (const message of worldbookDispatch.after) {
      targetArray.push(message);
    }
  }
}
