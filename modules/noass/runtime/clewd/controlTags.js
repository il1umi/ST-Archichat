export function cleanupClewdControlTags(content) {
  content = content
    .replace(/<regex( +order *= *\d)?>.*?<\/regex>/gm, '')
    .replace(/\r\n|\r/gm, '\n')
    .replace(/\s*<\|curtail\|>\s*/g, '\n')
    .replace(/\s*<\|join\|>\s*/g, '')
    .replace(/\s*<\|space\|>\s*/g, ' ')
    .replace(/<\|(\\.*?)\|>/g, function (innerMatch, p1) {
      try {
        return JSON.parse(`"${p1}"`);
      } catch {
        return innerMatch;
      }
    });

  return content
    .replace(/\s*<\|.*?\|>\s*/g, '\n\n')
    .trim()
    .replace(/^.+:/, '\n\n$&')
    .replace(/(?<=\n)\n(?=\n)/g, '');
}
