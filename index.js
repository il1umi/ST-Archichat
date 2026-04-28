// 对话规则构筑扩展（ST-Archichat）- 主入口

const EXT_KEY = 'st-archichat'; // 内部命名空间 key
const LEGACY_EXT_KEY = 'st-diff';
const DISPLAY_NAME = '对话规则构筑扩展';

function getCtx() {
  try {
    if (typeof getContext === 'function') return getContext();
    if (window?.SillyTavern?.getContext) return window.SillyTavern.getContext();
  } catch {}
  return null;
}

const DEFAULTS = {
  enabled: false,
  ui: { viewMode: 'side-by-side', ignoreWhitespace: true, ignoreCase: false, jsonNormalize: true },
  worldinfo: { lastSelectedA: null, lastSelectedB: null },
  history: [],
  version: 1,
  modules: { worldbook: true, presets: false },
  noass: { enabled: true },
};

async function openPanel(ctx) {
  // 使用酒馆的模板加载（提供 scripts/extensions 下相对路径）
  const base = `${resolveThisExtensionRootName()}/presentation/templates`;
  const html = await ctx.renderExtensionTemplateAsync(base, 'main');
  const $root = $(html);

  bindUpdateButton(ctx, $root);
  probeUpdateIndicator(ctx, $root).catch(() => {});

  // 注入到扩展面板
  const $target = $('#extensions_settings2').length ? $('#extensions_settings2') : $('#extensions_settings');
  $target.append($root);
}

function ensureSettings(ctx) {
  const root = ctx.extensionSettings || (window.extension_settings ||= {});

  // One-time migration: old ST-Diff → ST-Archichat (keep legacy key untouched for the new ST-Diff)
  // - If `st-archichat` doesn't exist, copy whole tree
  // - If it already exists (e.g. user opened once), only backfill missing top-level keys (non-destructive)
  const legacy = root?.[LEGACY_EXT_KEY];
  if (legacy && typeof legacy === 'object') {
    if (!root[EXT_KEY]) {
      try {
        root[EXT_KEY] = JSON.parse(JSON.stringify(legacy));
      } catch {
        root[EXT_KEY] = {};
      }
    } else {
      try {
        for (const key of Object.keys(legacy)) {
          if (typeof root[EXT_KEY][key] === 'undefined') {
            root[EXT_KEY][key] = JSON.parse(JSON.stringify(legacy[key]));
          }
        }
      } catch {}
    }
  }
  root[EXT_KEY] ||= JSON.parse(JSON.stringify(DEFAULTS));
  return root[EXT_KEY];
}

async function init() {
  const ctx = getCtx();
  if (!ctx?.renderExtensionTemplateAsync) {
    console.error('[ST-Archichat] 宿主缺少 renderExtensionTemplateAsync');
    return;
  }

  // Ensure settings namespace exists + run one-time migration (st-diff -> st-archichat)
  ensureSettings(ctx);

  // 主面板
  await openPanel(ctx);

  // 首次尝试挂载无界面模块
  try {
    await Modules.noass.mount(ctx);
  } catch (e) {
    console.warn('[ST-Archichat] noass 初始化失败', e);
  }

  try {
    await Modules.macros.mount(ctx);
  } catch (e) {
    console.warn('[ST-Archichat] macros 初始化失败', e);
  }

  // 说明：世界书对比已拆分为独立扩展 ST-Diff，这里仅保留对话规则构筑相关模块。
}

// =============== 模块装载器（页面感知） ===============
const Modules = {
  noass: {
    mounted: false,
    async mount(ctx) {
      if (this.mounted) return;
      this.mounted = true;
      try {
        const mod = await import('./modules/noass/index.js');
        await mod.mount(ctx);
      } catch (e) {
        console.warn('[ST-Archichat] noass 模块加载失败', e);
        this.mounted = false;
      }
    },
    async unmount(ctx) {
      if (!this.mounted) return;
      this.mounted = false;
      try {
        const mod = await import('./modules/noass/index.js');
        if (typeof mod.unmount === 'function') {
          await mod.unmount(ctx);
        }
      } catch (e) {
        console.warn('[ST-Archichat] noass 模块卸载失败', e);
      }
    },
  },
  macros: {
    mounted: false,
    async mount(ctx) {
      if (this.mounted) return;
      this.mounted = true;
      try {
        const mod = await import('./modules/macros/index.js');
        await mod.mount(ctx);
      } catch (e) {
        console.warn('[ST-Archichat] macros 模块加载失败', e);
        this.mounted = false;
      }
    },
    async unmount(ctx) {
      if (!this.mounted) return;
      this.mounted = false;
      try {
        const mod = await import('./modules/macros/index.js');
        if (typeof mod.unmount === 'function') {
          await mod.unmount(ctx);
        }
      } catch (e) {
        console.warn('[ST-Archichat] macros 模块卸载失败', e);
      }
    },
  },
  presets: {
    mounted: false,
    async mount(ctx) {
      if (this.mounted) return; this.mounted = true;
      try {
        const mod = await import('./modules/presets/presets.module.js');
        await mod.mount(ctx);
      } catch (e) { console.warn('[ST-Archichat] 预设模块加载失败', e); }
    },
    unmount() { /* 预留 */ },
  }
};

function resolveRequestHeaders(ctx) {
  const fallback = { 'Content-Type': 'application/json' };
  try {
    const headers = typeof ctx?.getRequestHeaders === 'function'
      ? ctx.getRequestHeaders()
      : typeof window?.getRequestHeaders === 'function'
        ? window.getRequestHeaders()
        : null;

    if (!headers || typeof headers !== 'object') return fallback;
    if (!('Content-Type' in headers)) {
      return { ...headers, 'Content-Type': 'application/json' };
    }
    return headers;
  } catch {
    return fallback;
  }
}

function resolvePopupApi(ctx) {
  const callGenericPopup = ctx?.callGenericPopup || window?.callGenericPopup;
  const POPUP_TYPE = ctx?.POPUP_TYPE || window?.POPUP_TYPE || {};
  return { callGenericPopup, POPUP_TYPE };
}

function escapeHtml(text) {
  const amp = '\u0026';
  const input = String(text ?? '');
  return input
    .replace(/\u0026/g, amp + 'amp;')
    .replace(/\u003C/g, amp + 'lt;')
    .replace(/\u003E/g, amp + 'gt;')
    .replace(/\u0022/g, amp + 'quot;')
    .replace(/\u0027/g, amp + '#39;');
}

function shortHash(hash) {
  return typeof hash === 'string' && hash.length >= 7 ? hash.slice(0, 7) : '';
}

function resolveThisExtensionFolderName(fallback = 'ST-Archichat') {
  try {
    const url = new URL(import.meta.url);
    const marker = '/scripts/extensions/';
    const pathname = String(url.pathname || '');
    const index = pathname.lastIndexOf(marker);
    if (index < 0) return fallback;

    const relative = pathname.slice(index + marker.length).replace(/^\/+/, '');
    const parts = relative.split('/').filter(Boolean);
    if (parts[0] === 'third-party' && parts[1]) return parts[1];
    if (parts[0]) return parts[0];
    return fallback;
  } catch {
    return fallback;
  }
}

function resolveThisExtensionRootName(fallback = 'ST-Archichat') {
  try {
    const url = new URL(import.meta.url);
    const marker = '/scripts/extensions/';
    const pathname = String(url.pathname || '');
    const index = pathname.lastIndexOf(marker);
    if (index < 0) return `third-party/${fallback}`;

    const relative = pathname.slice(index + marker.length).replace(/^\/+/, '');
    const parts = relative.split('/').filter(Boolean);
    if (parts[0] === 'third-party' && parts[1]) return `third-party/${parts[1]}`;
    if (parts[0]) return parts[0];
    return `third-party/${fallback}`;
  } catch {
    return `third-party/${fallback}`;
  }
}

async function postExtensionApi(ctx, endpoint, { extensionName, global }) {
  const headers = resolveRequestHeaders(ctx);
  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ extensionName, global }),
  });
}

async function postWithScopeFallback(ctx, endpoint, extensionName) {
  const localRes = await postExtensionApi(ctx, endpoint, { extensionName, global: false });
  if (localRes.status === 404) {
    const globalRes = await postExtensionApi(ctx, endpoint, { extensionName, global: true });
    return { response: globalRes, global: true };
  }
  return { response: localRes, global: false };
}

async function readResponsePayload(response) {
  if (!response) return { ok: false, text: '' };
  try {
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
  } catch {}
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function buildUpdatePopupContent(payload) {
  const {
    extensionName,
    scopeLabel,
    branchName,
    localCommit,
    remoteCommit,
    remoteLabel,
    remoteUrl,
    isUpToDate,
  } = payload;

  const wrapper = document.createElement('div');
  wrapper.className = 'stdiff-update-popup';

  const safeBranch = escapeHtml(branchName || 'unknown');
  const safeLocal = escapeHtml(shortHash(localCommit) || 'unknown');
  const safeRemote = escapeHtml(shortHash(remoteCommit) || 'unknown');
  const safeRemoteLabel = escapeHtml(remoteLabel || '（未能获取远端提交描述）');
  const safeRemoteUrl = escapeHtml(remoteUrl || '');

  const statusText = isUpToDate ? '已是最新' : '检测到更新';
  const downloadDisabled = isUpToDate || !localCommit;

  wrapper.innerHTML = `
    <div class="stdiff-update-popup__meta"><b>${escapeHtml(DISPLAY_NAME)} 更新</b></div>
    <div class="stdiff-update-popup__meta">扩展目录：${escapeHtml(extensionName)}（${escapeHtml(scopeLabel)}）</div>
    <div class="stdiff-update-popup__meta">当前分支：${safeBranch}</div>
    <div class="stdiff-update-popup__meta">本地提交：${safeLocal}</div>
    <div class="stdiff-update-popup__meta">远端最新：${safeRemote} — ${safeRemoteLabel}</div>
    ${safeRemoteUrl ? `<div class="stdiff-update-popup__meta">远端地址：${safeRemoteUrl}</div>` : ''}
    <div class="stdiff-update-popup__meta">状态：${escapeHtml(statusText)}</div>
    <div class="stdiff-update-popup__actions">
      <button type="button" class="menu_button menu_button_icon stdiff-update-download ${downloadDisabled ? 'is-disabled' : ''}" ${downloadDisabled ? 'disabled' : ''}>
        <i class="fa-solid fa-download fa-fw"></i>
        <span>下载覆盖</span>
      </button>
    </div>
  `;

  return { wrapper, downloadDisabled };
}

async function probeUpdateIndicator(ctx, $root) {
  try {
    const $button = $root?.find?.('[data-stdiff-action="check-update"]');
    if (!$button?.length) return;

    if ($button.data('stdiffUpdateProbeDone')) return;
    $button.data('stdiffUpdateProbeDone', true);

    const extensionName = resolveThisExtensionFolderName();
    const versionReq = await postWithScopeFallback(ctx, '/api/extensions/version', extensionName);
    const versionRes = versionReq.response;
    if (!versionRes?.ok) return;

    const versionData = await versionRes.json();
    const branchName = String(versionData?.currentBranchName || '');
    const localCommit = String(versionData?.currentCommitHash || '');
    const isUpToDate = Boolean(versionData?.isUpToDate);

    const updateAvailable = Boolean(branchName && localCommit && !isUpToDate);
    $button.toggleClass('is-update-available', updateAvailable);
    if (updateAvailable) {
      $button.attr('title', '检测到云端更新，点击查看');
    }
  } catch (error) {
    console.debug?.('[ST-Archichat][update] 静默检查更新失败', error);
  }
}

async function openUpdatePopup(ctx, triggerButton) {
  const { callGenericPopup, POPUP_TYPE } = resolvePopupApi(ctx);
  if (typeof callGenericPopup !== 'function') {
    toastr?.error?.('宿主缺少 callGenericPopup，无法展示更新弹窗。');
    return;
  }

  const extensionName = resolveThisExtensionFolderName();
  const $trigger = triggerButton ? $(triggerButton) : null;
  const $icon = $trigger?.find?.('i') ?? null;

  try {
    $trigger?.prop?.('disabled', true);
    $icon?.addClass?.('fa-spin');

    const versionReq = await postWithScopeFallback(ctx, '/api/extensions/version', extensionName);
    const versionRes = versionReq.response;

    if (!versionRes?.ok) {
      if (versionRes.status === 403) {
        toastr?.error?.('权限不足：无法检查更新（全局扩展需要管理员权限）。', DISPLAY_NAME);
        return;
      }
      const text = await readResponsePayload(versionRes);
      toastr?.error?.(typeof text === 'string' ? text : '检查更新失败');
      return;
    }

    const versionData = await versionRes.json();
    const branchName = String(versionData?.currentBranchName || '');
    const localCommit = String(versionData?.currentCommitHash || '');
    const isUpToDate = Boolean(versionData?.isUpToDate);
    const remoteUrl = String(versionData?.remoteUrl || '');
    const isGlobal = versionReq.global === true;

    if (!branchName || !localCommit) {
      const content = document.createElement('div');
      content.className = 'stdiff-update-popup';
      content.innerHTML = `
        <div class="stdiff-update-popup__meta"><b>${escapeHtml(DISPLAY_NAME)} 更新</b></div>
        <div class="stdiff-update-popup__meta">该扩展似乎不是 Git 安装（或没有提交记录），无法自动检查与更新。</div>
        ${remoteUrl ? `<div class="stdiff-update-popup__meta">远端地址：${escapeHtml(remoteUrl)}</div>` : ''}
      `;
      await callGenericPopup(content, POPUP_TYPE.TEXT ?? 1, '', { wide: true, allowVerticalScrolling: true, leftAlign: true });
      return;
    }

    const branchesRes = await postExtensionApi(ctx, '/api/extensions/branches', { extensionName, global: isGlobal });
    let remoteCommit = '';
    let remoteLabel = '';

    if (branchesRes?.ok) {
      const branches = await branchesRes.json();
      const wanted = `origin/${branchName}`;
      const remote = Array.isArray(branches)
        ? branches.find((b) => b?.name === wanted) || branches.find((b) => typeof b?.name === 'string' && b.name.endsWith(`/${wanted}`))
        : null;
      remoteCommit = String(remote?.commit || '');
      remoteLabel = String(remote?.label || '');
    }

    const scopeLabel = isGlobal ? '全局' : '本地';
    const { wrapper, downloadDisabled } = buildUpdatePopupContent({
      extensionName,
      scopeLabel,
      branchName,
      localCommit,
      remoteCommit,
      remoteLabel,
      remoteUrl,
      isUpToDate,
    });

    const downloadButton = wrapper.querySelector('.stdiff-update-download');
    if (downloadButton && downloadDisabled) {
      downloadButton.setAttribute('title', isUpToDate ? '已是最新' : '无法确认远端信息');
    }

    if (downloadButton && !downloadDisabled) {
      downloadButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const icon = downloadButton.querySelector('i');
        try {
          downloadButton.disabled = true;
          icon?.classList?.add('fa-spin');
          toastr?.info?.('正在下载并覆盖更新，请稍候…', DISPLAY_NAME);

          const updateRes = await postExtensionApi(ctx, '/api/extensions/update', { extensionName, global: isGlobal });
          if (!updateRes?.ok) {
            if (updateRes.status === 403) {
              toastr?.error?.('权限不足：无法更新扩展（全局扩展需要管理员权限）。', DISPLAY_NAME);
              downloadButton.disabled = false;
              return;
            }
            const text = await readResponsePayload(updateRes);
            toastr?.error?.(typeof text === 'string' ? text : '更新失败');
            downloadButton.disabled = false;
            return;
          }

          const data = await updateRes.json();
          toastr?.success?.(`已更新至 ${data?.shortCommitHash ?? '最新提交'}，即将刷新页面`, DISPLAY_NAME);
          try { ctx?.showLoader?.(); } catch {}
          location.reload();
        } catch (error) {
          console.error('[ST-Archichat][update] 更新失败', error);
          toastr?.error?.('更新失败，请查看控制台日志。', DISPLAY_NAME);
          downloadButton.disabled = false;
        } finally {
          icon?.classList?.remove('fa-spin');
        }
      }, { once: true });
    }

    await callGenericPopup(wrapper, POPUP_TYPE.TEXT ?? 1, '', { wide: true, allowVerticalScrolling: true, leftAlign: true });
  } catch (error) {
    console.error('[ST-Archichat][update] 检查更新失败', error);
    toastr?.error?.('检查更新失败，请查看控制台日志。', DISPLAY_NAME);
  } finally {
    $icon?.removeClass?.('fa-spin');
    $trigger?.prop?.('disabled', false);
  }
}

function bindUpdateButton(ctx, $root) {
  $root.on('click', '[data-stdiff-action="check-update"]', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openUpdatePopup(ctx, event.currentTarget);
  });
}

jQuery(() => { init().catch(console.error); });
