import {
  buildRolePrefixLookbehindFragment,
  escapeRegExp,
  formatRolePrefix,
  resolveRolePrefix,
} from './prefixUtils.js';

export function rewriteSystemPrefixes(content, prefixs, mergeDisable) {
  const systemPrefix = resolveRolePrefix(prefixs, 'system');
  if (!systemPrefix) return content;

  const userAssistantLookbehind = buildRolePrefixLookbehindFragment(prefixs, ['user', 'assistant']);
  const escapedSystem = escapeRegExp(systemPrefix);
  const systemPattern1 = new RegExp(
    `(\\n\\n|^\\s*)${userAssistantLookbehind}${escapedSystem}:\\s*`,
    'gs',
  );
  const systemPattern2 = new RegExp(`(\\n\\n|^\\s*)${escapedSystem}: *`, 'g');
  const userPrefix = formatRolePrefix(resolveRolePrefix(prefixs, 'user'));

  return content
    .replace(systemPattern1, '$1')
    .replace(
      systemPattern2,
      mergeDisable.all || mergeDisable.user || mergeDisable.system || !userPrefix ? '$1' : userPrefix,
    );
}
