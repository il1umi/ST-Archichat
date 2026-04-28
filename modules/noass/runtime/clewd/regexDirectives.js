export function applyRegexDirectives(content, order, options = {}) {
  const { logHandler, onError } = options || {};
  let regexLog = '';
  const regexPattern = `<regex(?: +order *= *${order})${order === 2 ? '?' : ''}> *"(/?)(.*)\\1(.*?)" *: *"(.*?)" *</regex>`;
  const matches = content.match(new RegExp(regexPattern, 'gm'));

  if (matches) {
    for (const match of matches) {
      try {
        const reg = /<regex(?: +order *= *\d)?> *"(\/?)(.*)\1(.*?)" *: *"(.*?)" *<\/regex>/.exec(match);
        regexLog += `${match}\n`;
        const replacePattern = new RegExp(reg[2], reg[3]);
        const replacement = JSON.parse(`"${reg[4].replace(/\\?"/g, '\\"')}"`);
        content = content.replace(replacePattern, replacement);
        if (typeof logHandler === 'function') {
          logHandler('hyperRegex:match', { order, match });
        }
      } catch (error) {
        if (typeof onError === 'function') {
          onError(error);
        }
      }
    }
  }

  return [content, regexLog];
}
