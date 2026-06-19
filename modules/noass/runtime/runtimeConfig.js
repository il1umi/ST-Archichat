import { defaultTemplate } from '../state/defaults.js';
import { exportWorldbookSnapshot } from './wibridge/cache.js';
import { buildWorldbookRuntimeGroups } from './wibridge/normalize.js';
import { attachDryRunHelpers } from './wibridge/sentinel.js';
import { setWorldbookDebug } from './wibridge/state.js';

export function buildRuntimeConfig(template) {
  const config = JSON.parse(JSON.stringify(defaultTemplate));
  setWorldbookDebug(template.debug_worldbook === true);

  const keys = [
    'user',
    'assistant',
    'example_user',
    'example_assistant',
    'system',
    'separator',
    'separator_system',
    'prefill_user',
  ];

  for (const key of keys) {
    config[key] = template[key];
  }

  config.capture_enabled = template.capture_enabled !== false;
  config.capture_rules = template.capture_rules ? template.capture_rules.map((rule) => ({ ...rule })) : [];
  config.stored_data = template.stored_data || (template.stored_data = {});
  config.single_user = !!template.single_user;
  config.inject_prefill = template.inject_prefill !== false;
  config.clean_clewd = !!template.clean_clewd;
  // 子能力开关：对话合并 / 世界书搬运（缺省按 true，兼容历史"开 noass = 合并 + 搬世界书"）
  config.merge_enabled = template.merge_enabled !== false;
  config.worldbook_enabled = template.worldbook_enabled !== false;
  config.worldbook = {
    // 关闭世界书搬运时置空运行期组，合并路径的注入/分发会自然空转（无需改 mergeBlockProcessor）
    groups: config.worldbook_enabled ? buildWorldbookRuntimeGroups(template) : [],
    snapshot: exportWorldbookSnapshot(),
  };
  // 在同一轮 completion 中只注入一次 prefill（即使因 NO_TRANS_TAG 拆分为多个合并块）
  config.__prefillInjected = false;

  attachDryRunHelpers(config);
  return config;
}
