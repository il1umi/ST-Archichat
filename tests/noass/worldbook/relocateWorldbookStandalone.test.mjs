import test from 'node:test';
import assert from 'node:assert/strict';

import { relocateWorldbookStandalone } from '../../../modules/noass/runtime/worldbook/application/relocateWorldbookStandalone.js';

const baseDeps = () => ({
  cloneMessageArray: (m) => JSON.parse(JSON.stringify(m)),
  normalizeWorldbookFragment: (s) => (typeof s === 'string' ? s.trim() : ''),
  warn: () => {},
  debug: () => {},
});

const snapshot = { entriesByDepth: { 0: [{ content: 'wb' }] } };

function customGroup(overrides = {}) {
  return {
    id: 'g0',
    target: { anchor: 'custom', customKey: '[[WB]]' },
    sentinel: { prefix: '__P__', opened: false, moved: false },
    clean_orphan_anchor: false,
    ...overrides,
  };
}

test('relocateWorldbookStandalone 把世界书搬到 customKey 处并原位清除', () => {
  const source = [
    { role: 'system', content: '锚点在这里：[[WB]]' },
    { role: 'user', content: '世界书原文XYZ' },
  ];
  const config = { worldbook: { groups: [customGroup()], snapshot } };

  const deps = {
    ...baseDeps(),
    injectWorldbookSentinels: (cfg, working) => {
      const g = cfg.worldbook.groups[0];
      working[1].content = `${g.sentinel.prefix}BEGIN${working[1].content}${g.sentinel.prefix}END`;
    },
  };

  const result = relocateWorldbookStandalone(config, source, deps);

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.placed, 1);
  assert.deepEqual(result.messages, [
    { role: 'system', content: '锚点在这里：世界书原文XYZ' },
  ]);
});

test('relocateWorldbookStandalone 跳过非 custom 组', () => {
  const source = [{ role: 'user', content: 'hi [[WB]]' }];
  const config = {
    worldbook: {
      groups: [customGroup({ target: { anchor: 'before', customKey: '' } })],
      snapshot,
    },
  };

  let injected = false;
  const deps = {
    ...baseDeps(),
    injectWorldbookSentinels: () => {
      injected = true;
    },
  };

  const result = relocateWorldbookStandalone(config, source, deps);

  assert.equal(result.changed, false);
  assert.equal(result.diagnostics.skippedNonCustom, 1);
  assert.equal(result.diagnostics.customGroups, 0);
  assert.equal(injected, false);
  assert.deepEqual(result.messages, source);
});

test('relocateWorldbookStandalone 不污染原始消息数组', () => {
  const source = [
    { role: 'system', content: '锚点：[[WB]]' },
    { role: 'user', content: '世界书内容' },
  ];
  const sourceSnapshot = JSON.parse(JSON.stringify(source));
  const config = { worldbook: { groups: [customGroup()], snapshot } };

  const deps = {
    ...baseDeps(),
    injectWorldbookSentinels: (cfg, working) => {
      const g = cfg.worldbook.groups[0];
      working[1].content = `${g.sentinel.prefix}BEGIN${working[1].content}${g.sentinel.prefix}END`;
    },
  };

  const result = relocateWorldbookStandalone(config, source, deps);

  assert.deepEqual(source, sourceSnapshot);
  assert.notEqual(result.messages, source);
});

test('relocateWorldbookStandalone 锚点缺失时保持世界书原位不动', () => {
  const source = [{ role: 'user', content: '没有锚点的世界书原文' }];
  const config = { worldbook: { groups: [customGroup()], snapshot } };

  let injected = false;
  const deps = {
    ...baseDeps(),
    injectWorldbookSentinels: () => {
      injected = true;
    },
  };

  const result = relocateWorldbookStandalone(config, source, deps);

  assert.equal(result.changed, false);
  assert.equal(result.diagnostics.anchorMissing, 1);
  assert.equal(injected, false);
  assert.equal(result.messages[0].content, '没有锚点的世界书原文');
});

test('relocateWorldbookStandalone 未命中且开启 clean_orphan 时清除孤儿锚点', () => {
  const source = [{ role: 'user', content: '前[[WB]]后' }];
  const config = {
    worldbook: { groups: [customGroup({ clean_orphan_anchor: true })], snapshot },
  };

  const deps = {
    ...baseDeps(),
    injectWorldbookSentinels: () => {
      // 模拟未命中：不插入任何哨兵
    },
  };

  const result = relocateWorldbookStandalone(config, source, deps);

  assert.equal(result.changed, true);
  assert.equal(result.messages[0].content, '前后');
});

test('relocateWorldbookStandalone 多个组共享 customKey 时不丢后续组原文', () => {
  const source = [
    { role: 'system', content: '槽位：[[WB]]' },
    { role: 'user', content: '第一段世界书' },
    { role: 'assistant', content: '第二段世界书' },
  ];
  const groups = [
    customGroup({ id: 'g1', sentinel: { prefix: '__G1__', opened: false, moved: false } }),
    customGroup({ id: 'g2', sentinel: { prefix: '__G2__', opened: false, moved: false } }),
  ];
  const config = { worldbook: { groups, snapshot } };

  const deps = {
    ...baseDeps(),
    injectWorldbookSentinels: (cfg, working) => {
      const group = cfg.worldbook.groups[0];
      if (group.id === 'g1') {
        working[1].content = `${group.sentinel.prefix}BEGIN${working[1].content}${group.sentinel.prefix}END`;
      }
      if (group.id === 'g2') {
        working[2].content = `${group.sentinel.prefix}BEGIN${working[2].content}${group.sentinel.prefix}END`;
      }
    },
  };

  const result = relocateWorldbookStandalone(config, source, deps);

  assert.equal(result.diagnostics.placed, 1);
  assert.equal(result.diagnostics.anchorMissing, 1);
  assert.deepEqual(result.messages, [
    { role: 'system', content: '槽位：第一段世界书' },
    { role: 'assistant', content: '第二段世界书' },
  ]);
});
