export function relocateAtBlocks(content, prefixs) {
  const splitPattern = new RegExp(`\\n\\n(?=${prefixs.assistant}:|${prefixs.user}:)`, 'g');
  let splitContent = content.split(splitPattern);

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
