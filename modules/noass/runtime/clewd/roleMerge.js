export function mergeAdjacentRolePrefixes(content, prefixs, mergeDisable) {
  let splitContent = content.split(
    new RegExp(`\\n\\n(${prefixs.assistant}|${prefixs.user}|${prefixs.system}):`, 'g'),
  );
  content =
    splitContent[0] +
    splitContent.slice(1).reduce(function (acc, current, index, array) {
      const merge =
        index > 1 &&
        current === array[index - 2] &&
        ((current === prefixs.user && !mergeDisable.user) ||
          (current === prefixs.assistant && !mergeDisable.assistant) ||
          (current === prefixs.system && !mergeDisable.system));
      return acc + (index % 2 !== 0 ? current.trim() : `\n\n${merge ? '' : `${current}: `}`);
    }, '');
  return content;
}
