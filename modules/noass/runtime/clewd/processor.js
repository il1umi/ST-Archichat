/**
 * @file 基于 clewd 迁移实现的对话合并核心，负责解析 `<regex>` 指令与角色前缀。
 */
import { defaultTemplate } from '../../state/defaults.js';
import { buildAssistantOutput } from './outputBuilder.js';
import { composeClewdPrompt } from './promptComposer.js';

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

  const result = composeClewdPrompt(prefixs, messages, {
    initialPrompt: '',
    claudeMode: true,
    logHandler,
    onInvalidMessage: (message) => {
      console.warn('[ST-Archichat][noass] 跳过无效消息对象:', message);
    },
    onRegexError: (error) => {
      console.warn('[ST-Archichat][noass] Regex processing error:', error);
    },
  });
  const prompt = result.prompt;

  return buildAssistantOutput(prompt, prefixs, (error) => {
    console.error('[ST-Archichat][noass] separator 解析失败', error);
  });
}
