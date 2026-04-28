export function rewriteSystemPrefixes(content, prefixs, mergeDisable) {
  const systemPattern1 = new RegExp(
    `(\\n\\n|^\\s*)(?<!\\n\\n(${prefixs.user}|${prefixs.assistant}):.*?)${prefixs.system}:\\s*`,
    'gs',
  );
  const systemPattern2 = new RegExp(`(\\n\\n|^\\s*)${prefixs.system}: *`, 'g');

  return content
    .replace(systemPattern1, '$1')
    .replace(
      systemPattern2,
      mergeDisable.all || mergeDisable.user || mergeDisable.system ? '$1' : `\n\n${prefixs.user}: `,
    );
}
