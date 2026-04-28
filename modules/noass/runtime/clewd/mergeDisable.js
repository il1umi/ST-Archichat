export function parseMergeDisableFlags(content) {
  const text = typeof content === 'string' ? content : '';
  return {
    all: text.indexOf('<|Merge Disable|>') !== -1,
    system: text.indexOf('<|Merge System Disable|>') !== -1,
    user: text.indexOf('<|Merge Human Disable|>') !== -1,
    assistant: text.indexOf('<|Merge Assistant Disable|>') !== -1,
  };
}
