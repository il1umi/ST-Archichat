import { buildRoleStartLookaheadPattern } from './prefixUtils.js';

export function relocateAtBlocks(content, prefixs) {
  const splitPattern = buildRoleStartLookaheadPattern(prefixs, ['assistant', 'user']);
  let splitContent = splitPattern ? content.split(splitPattern) : [content];

  let match;
  const atPattern = /<@(\d+)>(.*?)<\/@\1>/gs;
  while ((match = atPattern.exec(content)) !== null) {
    let index = splitContent.length - parseInt(match[1]) - 1;
    if (index >= 0) {
      splitContent[index] += `\n\n${match[2]}`;
    }
    content = content.replace(match[0], '');
  }

  return splitContent.join('\n\n').replace(/<@(\d+)>.*?<\/@\1>/gs, '');
}
