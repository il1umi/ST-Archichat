function hasOwnPrefix(prefixs, key) {
  return Boolean(prefixs && Object.prototype.hasOwnProperty.call(prefixs, key));
}

export function normalizePrefixText(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolveRolePrefix(prefixs, role) {
  if (hasOwnPrefix(prefixs, role)) {
    return normalizePrefixText(prefixs[role]);
  }

  return normalizePrefixText(role);
}

export function resolveMessagePrefix(prefixs, role, name) {
  if (name && hasOwnPrefix(prefixs, name)) {
    return normalizePrefixText(prefixs[name]);
  }

  return resolveRolePrefix(prefixs, role);
}

export function formatPromptSegmentPrefix(prefix, name = '') {
  const label = normalizePrefixText(prefix);
  if (!label) return '\n\n';
  return `\n\n${label}${name ? `: ${name}` : ''}: `;
}

export function formatRolePrefix(prefix, { leadingNewlines = true, trailingSpace = true } = {}) {
  const label = normalizePrefixText(prefix);
  if (!label) return '';
  return `${leadingNewlines ? '\n\n' : ''}${label}:${trailingSpace ? ' ' : ''}`;
}

export function getConfiguredRolePrefixes(prefixs, roles) {
  const seen = new Set();
  const prefixes = [];

  for (const role of roles) {
    const prefix = hasOwnPrefix(prefixs, role)
      ? normalizePrefixText(prefixs[role])
      : normalizePrefixText(role);
    if (!prefix || seen.has(prefix)) continue;

    seen.add(prefix);
    prefixes.push(prefix);
  }

  return prefixes;
}

export function buildRoleStartLookaheadPattern(prefixs, roles) {
  const alternatives = getConfiguredRolePrefixes(prefixs, roles)
    .map((prefix) => `${escapeRegExp(prefix)}:`);

  if (!alternatives.length) return null;
  return new RegExp(`\\n\\n(?=${alternatives.join('|')})`, 'g');
}

export function buildRolePrefixCapturePattern(prefixs, roles) {
  const alternatives = getConfiguredRolePrefixes(prefixs, roles)
    .map((prefix) => escapeRegExp(prefix));

  if (!alternatives.length) return null;
  return new RegExp(`\\n\\n(${alternatives.join('|')}):`, 'g');
}

export function buildRolePrefixLookbehindFragment(prefixs, roles) {
  const alternatives = getConfiguredRolePrefixes(prefixs, roles)
    .map((prefix) => escapeRegExp(prefix));

  if (!alternatives.length) return '';
  return `(?<!\\n\\n(${alternatives.join('|')}):.*?)`;
}
