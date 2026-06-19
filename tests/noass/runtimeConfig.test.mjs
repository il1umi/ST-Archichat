import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRuntimeConfig } from '../../modules/noass/runtime/runtimeConfig.js';
import { ensureTemplateDefaults } from '../../modules/noass/state/state.js';

test('buildRuntimeConfig 默认暴露两个子开关为 true 且构建世界书组', () => {
  const template = ensureTemplateDefaults({
    worldbook_groups: [{ enabled: true, target: { anchor: 'custom', customKey: '[[WB]]' } }],
  });

  const config = buildRuntimeConfig(template);

  assert.equal(config.merge_enabled, true);
  assert.equal(config.worldbook_enabled, true);
  assert.ok(config.worldbook.groups.length >= 1);
});

test('buildRuntimeConfig 关闭世界书搬运时门控 groups 为空', () => {
  const template = ensureTemplateDefaults({
    worldbook_enabled: false,
    worldbook_groups: [{ enabled: true, target: { anchor: 'custom', customKey: '[[WB]]' } }],
  });

  const config = buildRuntimeConfig(template);

  assert.equal(config.worldbook_enabled, false);
  assert.equal(config.worldbook.groups.length, 0);
});

test('buildRuntimeConfig 关闭合并不影响世界书组构建', () => {
  const template = ensureTemplateDefaults({
    merge_enabled: false,
    worldbook_groups: [{ enabled: true, target: { anchor: 'custom', customKey: '[[WB]]' } }],
  });

  const config = buildRuntimeConfig(template);

  assert.equal(config.merge_enabled, false);
  assert.equal(config.worldbook_enabled, true);
  assert.ok(config.worldbook.groups.length >= 1);
});
