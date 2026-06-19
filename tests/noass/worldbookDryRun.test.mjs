import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultTemplate, WORLD_INFO_POSITION } from '../../modules/noass/state/defaults.js';
import { updateLastCompletionSnapshot } from '../../modules/noass/runtime/completionSession.js';
import { runWorldbookDryRun } from '../../modules/noass/runtime/worldbookDryRun.js';
import { resetWorldbookCache, updateWorldbookCache } from '../../modules/noass/runtime/wibridge/cache.js';
import { setWorldbookLogAdapter } from '../../modules/noass/runtime/wibridge/state.js';

test('runWorldbookDryRun reports missing snapshot without throwing', async () => {
  const events = [];
  const warnings = [];
  setWorldbookLogAdapter({
    reset: () => events.push({ label: 'reset' }),
    append: (label, data, options) => events.push({ label, data, options }),
  });

  await runWorldbookDryRun({ toastr: { warning: (message) => warnings.push(message) } });

  assert.equal(events[0].label, 'reset');
  assert.equal(events[1].label, 'Dry Run 开始');
  assert.equal(events[2].label, 'Dry Run 失败：暂无可用对话快照');
  assert.deepEqual(warnings, ['暂无可用上下文，请先发送一轮消息。']);
});

test('runWorldbookDryRun uses standalone preview when merge is disabled', async () => {
  resetWorldbookCache({ notify: false, resetSubscribers: true });
  updateWorldbookCache([
    {
      uid: 'entry-1',
      world: 'world',
      comment: 'entry',
      content: '世界书内容',
      depth: 0,
      position: WORLD_INFO_POSITION.AT_DEPTH,
      order: 0,
    },
  ], { source: 'test' });

  const template = {
    ...defaultTemplate,
    merge_enabled: false,
    worldbook_enabled: true,
    worldbook_groups: [
      {
        enabled: true,
        label: 'custom搬运',
        mode: 'depthRange',
        depth: { min: 0, max: 0 },
        whitelist: { excludeDepths: [], excludeTitles: [] },
        target: { anchor: 'custom', customKey: '[[WB]]', role: 'system', order: 0 },
        clean_orphan_anchor: false,
        order: 0,
      },
    ],
    stored_data: {},
  };

  updateLastCompletionSnapshot(
    { active: 'main' },
    template,
    [
      { role: 'system', content: '放置：[[WB]]' },
      { role: 'user', content: '世界书内容' },
    ],
    { chat_completion_source: 'test' },
  );

  const events = [];
  setWorldbookLogAdapter({
    reset: () => events.push({ label: 'reset' }),
    append: (label, data, options) => events.push({ label, data, options }),
  });

  await runWorldbookDryRun({ toastr: { success: () => {} } });

  assert.ok(events.some((event) => event.label === '独立世界书搬运诊断'));
  assert.ok(events.some((event) => event.label === '独立搬运结果预览'));
  assert.equal(events.some((event) => event.label === '合并结果预览'), false);

  const preview = events.find((event) => event.label === '独立搬运结果预览');
  assert.match(preview.data.messages[0].preview, /世界书内容/);

  resetWorldbookCache({ notify: false, resetSubscribers: true });
});
