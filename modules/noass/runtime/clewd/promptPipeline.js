import { relocateAtBlocks } from './atRelocation.js';
import { cleanupClewdControlTags } from './controlTags.js';
import { parseMergeDisableFlags } from './mergeDisable.js';
import { applyRegexDirectives } from './regexDirectives.js';
import { mergeAdjacentRolePrefixes } from './roleMerge.js';
import { rewriteSystemPrefixes } from './systemRewrite.js';

function applyRegexOrder(content, order, options, appendRegexLog) {
  const [nextContent, regexLog] = applyRegexDirectives(content, order, options);
  appendRegexLog(regexLog);
  return nextContent;
}

export function runPromptPipeline(content, prefixs, options = {}) {
  let regexLogs = '';
  const regexOptions = {
    logHandler: options.logHandler,
    onError: options.onRegexError,
  };
  const appendRegexLog = (regexLog) => {
    regexLogs += regexLog;
  };

  content = applyRegexOrder(content, 1, regexOptions, appendRegexLog);

  const mergeDisable = parseMergeDisableFlags(content);

  content = rewriteSystemPrefixes(content, prefixs, mergeDisable);
  content = mergeAdjacentRolePrefixes(content, prefixs, mergeDisable);

  content = relocateAtBlocks(content, prefixs);

  content = applyRegexOrder(content, 2, regexOptions, appendRegexLog);
  content = mergeAdjacentRolePrefixes(content, prefixs, mergeDisable);

  content = applyRegexOrder(content, 3, regexOptions, appendRegexLog);

  return {
    prompt: cleanupClewdControlTags(content),
    regexLog: regexLogs,
  };
}
