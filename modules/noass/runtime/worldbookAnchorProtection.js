import { WORLD_BOOK_SENTINEL_PREFIX } from './clewd/constants.js';

function collectCustomAnchorKeys(config) {
  const runtimeGroups = Array.isArray(config?.worldbook?.groups) ? config.worldbook.groups : [];
  const customAnchors = [];

  for (const group of runtimeGroups) {
    if (group?.target?.anchor === 'custom') {
      const key = (group.target.customKey || '').trim();
      if (key && !customAnchors.includes(key)) {
        customAnchors.push(key);
      }
    }
  }

  return customAnchors;
}

export function createCustomAnchorProtection(config, blockToMerge) {
  const customAnchors = collectCustomAnchorKeys(config);
  const placeholderMap = new Map();
  let blockForProcess = blockToMerge;

  if (customAnchors.length) {
    blockForProcess = blockToMerge.map((message) => {
      if (!message || typeof message !== 'object') return message;
      const cloned = { ...message };
      if (typeof cloned.content === 'string' && cloned.content) {
        let updated = cloned.content;
        customAnchors.forEach((key, index) => {
          let placeholder = placeholderMap.get(key);
          if (!placeholder) {
            placeholder = `${WORLD_BOOK_SENTINEL_PREFIX}ANCHOR${index}__`;
            placeholderMap.set(key, placeholder);
          }
          if (updated.includes(key)) {
            updated = updated.split(key).join(placeholder);
          }
        });
        cloned.content = updated;
      }
      return cloned;
    });
  }

  return {
    blockForProcess,
    restoreContent(content) {
      if (!placeholderMap.size || typeof content !== 'string') return content;
      let restored = content;
      placeholderMap.forEach((placeholder, key) => {
        if (restored.includes(placeholder)) {
          restored = restored.split(placeholder).join(key);
        }
      });
      return restored;
    },
  };
}
