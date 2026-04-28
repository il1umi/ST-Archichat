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
  config.worldbook = {
    groups: buildWorldbookRuntimeGroups(template),
    snapshot: exportWorldbookSnapshot(),
  };
  // 在同一轮 completion 中只注入一次 prefill（即使因 NO_TRANS_TAG 拆分为多个合并块）
  config.__prefillInjected = false;

  attachDryRunHelpers(config);
  return config;
}
