import { buildRolePrefixCapturePattern, formatRolePrefix, resolveRolePrefix } from './prefixUtils.js';

export function mergeAdjacentRolePrefixes(content, prefixs, mergeDisable) {
  const splitPattern = buildRolePrefixCapturePattern(prefixs, ['assistant', 'user', 'system']);
  if (!splitPattern) return content;

  const rolePrefixes = {
    user: resolveRolePrefix(prefixs, 'user'),
    assistant: resolveRolePrefix(prefixs, 'assistant'),
    system: resolveRolePrefix(prefixs, 'system'),
  };

  let splitContent = content.split(splitPattern);
  content =
    splitContent[0] +
    splitContent.slice(1).reduce(function (acc, current, index, array) {
      const merge =
        index > 1 &&
        current === array[index - 2] &&
        ((current === rolePrefixes.user && !mergeDisable.user) ||
          (current === rolePrefixes.assistant && !mergeDisable.assistant) ||
          (current === rolePrefixes.system && !mergeDisable.system));
      return acc + (index % 2 !== 0 ? current.trim() : merge ? '\n\n' : formatRolePrefix(current));
    }, '');
  return content;
}
