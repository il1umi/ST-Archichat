/**
 * @file 基于 clewd 迁移实现的对话合并核心，负责解析 `<regex>` 指令与角色前缀。
 */
import { defaultTemplate } from '../../state/defaults.js';
import { relocateAtBlocks } from './atRelocation.js';
import { cleanupClewdControlTags } from './controlTags.js';
import { parseMergeDisableFlags } from './mergeDisable.js';
import { buildAssistantOutput } from './outputBuilder.js';
import { buildPrefixedPrompt } from './promptBuilder.js';
import { applyRegexDirectives } from './regexDirectives.js';
import { mergeAdjacentRolePrefixes } from './roleMerge.js';
import { rewriteSystemPrefixes } from './systemRewrite.js';

/**
 * clewd 合并流程核心实现。
 * @param {object} prefixs - 模板前缀配置
 * @param {Array} messages - 待合并的消息数组
 * @param {object} [options]
 * @param {Function} [options.logHandler] - 可选的日志回调，接收 (event, payload)
 * @returns {{ role: string, content: string }}
 */
/**
 * 执行 clewd 风格的消息合并，返回合并后的ass消息。
 *
 * @param {object} prefixs 模板前缀配置
 * @param {Array<{ role: string, content: string, name?: string }>} messages 待合并消息列表
 * @param {{ logHandler?: (event: string, payload?: Record<string, unknown>) => void }} [options] 可选日志钩子
 * @returns {{ role: string, content: string }} 供后续处理的合并结果
 */
export function process(prefixs, messages, options = {}) {
  const { logHandler } = options;
  prefixs = prefixs || defaultTemplate;

  const HyperProcess = function (system, messages, claudeMode) {
    const hyperRegex = function (content, order) {
      return applyRegexDirectives(content, order, {
        logHandler,
        onError: (error) => {
          console.warn('[ST-Archichat][noass] Regex processing error:', error);
        },
      });
    };

    const HyperPmtProcess = function (content) {
      const regex1 = hyperRegex(content, 1);
      content = regex1[0];
      regexLogs += regex1[1];

      const mergeDisable = parseMergeDisableFlags(content);

      content = rewriteSystemPrefixes(content, prefixs, mergeDisable);
      content = mergeAdjacentRolePrefixes(content, prefixs, mergeDisable);

      content = relocateAtBlocks(content, prefixs);

      const regex2 = hyperRegex(content, 2);
      content = regex2[0];
      regexLogs += regex2[1];
      content = mergeAdjacentRolePrefixes(content, prefixs, mergeDisable);

      const regex3 = hyperRegex(content, 3);
      content = regex3[0];
      regexLogs += regex3[1];

      return cleanupClewdControlTags(content);
    };

    let prompt = system || '';
    let regexLogs = '';

    if (!messages || messages.length === 0) {
      return { prompt: '', log: '' };
    }

    prompt = buildPrefixedPrompt(prompt, messages, prefixs, (message) => {
      console.warn('[ST-Archichat][noass] 跳过无效消息对象:', message);
    });

    prompt = HyperPmtProcess(prompt);
    if (!claudeMode && prompt) {
      prompt += `\n\n${prefixs.assistant}:`;
    }
    return { prompt: prompt, log: `\n####### Regex:\n${regexLogs}` };
  };

  const result = HyperProcess('', messages, true);
  const prompt = result.prompt;

  return buildAssistantOutput(prompt, prefixs, (error) => {
    console.error('[ST-Archichat][noass] separator 解析失败', error);
  });
}
