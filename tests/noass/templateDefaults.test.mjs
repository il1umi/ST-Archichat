import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureTemplateDefaults } from '../../modules/noass/state/state.js';

test('ensureTemplateDefaults 为缺失的子开关补默认 true（合并 + 世界书搬运）', () => {
  const template = ensureTemplateDefaults({});
  assert.equal(template.merge_enabled, true);
  assert.equal(template.worldbook_enabled, true);
});

test('ensureTemplateDefaults 归一化历史字符串布尔 merge_enabled', () => {
  const template = ensureTemplateDefaults({ merge_enabled: 'false' });
  assert.equal(template.merge_enabled, false);
});

test('ensureTemplateDefaults 归一化历史字符串布尔 worldbook_enabled', () => {
  const template = ensureTemplateDefaults({ worldbook_enabled: 'off' });
  assert.equal(template.worldbook_enabled, false);
});

test('ensureTemplateDefaults 保留显式 false 的子开关', () => {
  const template = ensureTemplateDefaults({ merge_enabled: false, worldbook_enabled: false });
  assert.equal(template.merge_enabled, false);
  assert.equal(template.worldbook_enabled, false);
});
