import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveNoassMode, NOASS_MODE } from '../../modules/noass/runtime/noassMode.js';

test('resolveNoassMode 合并与世界书都开 → merge', () => {
  assert.equal(resolveNoassMode({ merge_enabled: true, worldbook_enabled: true }), NOASS_MODE.MERGE);
});

test('resolveNoassMode 仅世界书开 → worldbook-only', () => {
  assert.equal(resolveNoassMode({ merge_enabled: false, worldbook_enabled: true }), NOASS_MODE.WORLDBOOK_ONLY);
});

test('resolveNoassMode 两者都关 → skip', () => {
  assert.equal(resolveNoassMode({ merge_enabled: false, worldbook_enabled: false }), NOASS_MODE.SKIP);
});

test('resolveNoassMode 合并开则忽略世界书开关（由合并管线内部门控）', () => {
  assert.equal(resolveNoassMode({ merge_enabled: true, worldbook_enabled: false }), NOASS_MODE.MERGE);
});

test('resolveNoassMode 缺省字段按 true（向后兼容）', () => {
  assert.equal(resolveNoassMode({}), NOASS_MODE.MERGE);
});

test('resolveNoassMode 空配置 → skip', () => {
  assert.equal(resolveNoassMode(null), NOASS_MODE.SKIP);
});
