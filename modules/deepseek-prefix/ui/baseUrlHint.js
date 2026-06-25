import { resolveDeepSeekPrefixHintState } from '../adapters/sillyTavernOpenAi.js';
import { shouldShowDeepSeekPrefixHint } from '../application/hintVisibility.js';

const CUSTOM_API_URL_INPUT_SELECTOR = '#custom_api_url_text';
const CUSTOM_API_FORM_SELECTOR = '#custom_form';
const CHAT_COMPLETION_SOURCE_SELECTOR = '#chat_completion_source';
const HINT_TRIGGER_CLASS = 'st-archichat-deepseek-prefix-hint-trigger';
const HINT_HEADING_CLASS = 'st-archichat-deepseek-prefix-heading';
const POPUP_CLASS = 'st-archichat-deepseek-prefix-popup';
const POPUP_ID = 'st-archichat-deepseek-prefix-popup';

const POPUP_WIDTH = 320;
const POPUP_HEIGHT = 154;
const TAIL_X = 40;
const EDGE_GAP = 8;
const ANCHOR_GAP = 6;

const OUTLINE_RIGHT = 'M40 4 L54 18 L300 18 A14 14 0 0 1 314 32 L314 132 A14 14 0 0 1 300 146 L160 146';
const OUTLINE_LEFT = 'M40 4 L28 18 L20 18 A14 14 0 0 0 6 32 L6 132 A14 14 0 0 0 20 146 L160 146';
const BUBBLE_FILL =
  'M40 4 L54 18 L300 18 A14 14 0 0 1 314 32 L314 132 A14 14 0 0 1 300 146 L20 146 A14 14 0 0 1 6 132 L6 32 A14 14 0 0 1 20 18 L28 18 Z';

let observer = null;
let triggerElement = null;
let popupElement = null;
let closeTimer = null;
let openFrame = null;
let refreshTimer = null;
let refreshSequence = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function clearOpenFrame() {
  if (openFrame) {
    cancelAnimationFrame(openFrame);
    openFrame = null;
  }
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function findCustomEndpointHeading() {
  const form = document.querySelector(CUSTOM_API_FORM_SELECTOR);
  if (!form) return null;

  return (
    form.querySelector('h4[data-i18n="Custom Endpoint (Base URL)"]') ||
    Array.from(form.querySelectorAll('h4')).find((heading) => {
      const text = String(heading.textContent || '').trim();
      return text.includes('Custom Endpoint') || text.includes('基础 URL');
    }) ||
    null
  );
}

function createHintTrigger() {
  const link = document.createElement('a');
  link.href = '#';
  link.className = `notes-link ${HINT_TRIGGER_CLASS}`;
  link.setAttribute('aria-label', 'DeepSeek assistant prefill prefix 提示');
  link.setAttribute('aria-describedby', POPUP_ID);
  link.setAttribute('aria-expanded', 'false');
  link.setAttribute('role', 'button');

  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-circle-question note-link-span';
  icon.setAttribute('aria-hidden', 'true');
  link.append(icon);

  link.addEventListener('pointerenter', () => openPopup(link));
  link.addEventListener('mouseenter', () => openPopup(link));
  link.addEventListener('focus', () => openPopup(link));
  link.addEventListener('pointerleave', scheduleClosePopup);
  link.addEventListener('mouseleave', scheduleClosePopup);
  link.addEventListener('blur', scheduleClosePopup);
  link.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPopup(link);
  });

  return link;
}

function ensurePopup() {
  if (popupElement?.isConnected) return popupElement;

  const popup = document.createElement('div');
  popup.id = POPUP_ID;
  popup.className = POPUP_CLASS;
  popup.setAttribute('role', 'tooltip');
  popup.setAttribute('aria-hidden', 'true');
  popup.dataset.open = 'false';
  popup.style.width = `${POPUP_WIDTH}px`;
  popup.style.height = `${POPUP_HEIGHT}px`;

  popup.innerHTML = `
    <svg class="st-archichat-deepseek-prefix-popup-svg" viewBox="0 0 ${POPUP_WIDTH} ${POPUP_HEIGHT}" aria-hidden="true">
      <path class="st-archichat-deepseek-prefix-popup-fill" d="${BUBBLE_FILL}"></path>
      <g fill="none" stroke-width="1.5" stroke-linecap="round">
        <path class="st-archichat-deepseek-prefix-popup-outline" pathLength="100" d="${OUTLINE_LEFT}"></path>
        <path class="st-archichat-deepseek-prefix-popup-outline" pathLength="100" d="${OUTLINE_RIGHT}"></path>
      </g>
    </svg>
    <div class="st-archichat-deepseek-prefix-popup-content">
      <p class="st-archichat-deepseek-prefix-popup-copy">
        ST-Archichat检测到目标url含https://api.deepseek.com，且预设的最后一个条目归属于assistant，现在会补全prefix=true
      </p>
    </div>
  `;

  document.body.append(popup);
  popupElement = popup;
  return popup;
}

function positionPopup(anchor) {
  const popup = ensurePopup();
  const rect = anchor.getBoundingClientRect();
  const anchorX = rect.left + rect.width / 2;
  const anchorY = rect.bottom + ANCHOR_GAP;
  const left = clamp(anchorX - TAIL_X, EDGE_GAP, window.innerWidth - POPUP_WIDTH - EDGE_GAP);
  const top = clamp(anchorY, EDGE_GAP, window.innerHeight - POPUP_HEIGHT - EDGE_GAP);

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function openPopup(anchor) {
  clearCloseTimer();
  clearOpenFrame();
  const popup = ensurePopup();
  positionPopup(anchor);
  popup.setAttribute('aria-hidden', 'false');
  triggerElement?.setAttribute('aria-expanded', 'true');

  popup.dataset.open = 'false';
  openFrame = requestAnimationFrame(() => {
    popup.dataset.open = 'true';
    openFrame = null;
  });
}

function closePopup() {
  clearCloseTimer();
  clearOpenFrame();
  if (!popupElement) return;
  popupElement.dataset.open = 'false';
  popupElement.setAttribute('aria-hidden', 'true');
  triggerElement?.setAttribute('aria-expanded', 'false');
}

function scheduleClosePopup() {
  clearCloseTimer();
  closeTimer = setTimeout(closePopup, 80);
}

function injectHintTrigger() {
  const input = document.querySelector(CUSTOM_API_URL_INPUT_SELECTOR);
  const heading = findCustomEndpointHeading();
  if (!input || !heading) return;

  const existing = heading.querySelector(`.${HINT_TRIGGER_CLASS}`);
  if (existing) {
    triggerElement = existing;
    return;
  }

  if (triggerElement && !triggerElement.isConnected) {
    triggerElement = null;
  }

  heading.classList.add(HINT_HEADING_CLASS);
  triggerElement = createHintTrigger();
  heading.append(triggerElement);
}

function removeHintTrigger() {
  closePopup();
  triggerElement?.remove();
  triggerElement = null;
  popupElement?.remove();
  popupElement = null;

  const heading = findCustomEndpointHeading();
  heading?.classList?.remove(HINT_HEADING_CLASS);
}

async function reconcileHintVisibility() {
  const sequence = ++refreshSequence;

  try {
    const state = await resolveDeepSeekPrefixHintState();
    if (sequence !== refreshSequence) return;

    if (shouldShowDeepSeekPrefixHint(state)) {
      injectHintTrigger();
    } else {
      removeHintTrigger();
    }
  } catch (error) {
    console.debug?.('[ST-Archichat][deepseek-prefix] 更新提示问号可见性失败', error);
    removeHintTrigger();
  }
}

function scheduleHintVisibilityRefresh(delayMs = 60) {
  clearRefreshTimer();
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    reconcileHintVisibility();
  }, delayMs);
}

function onDocumentKeyDown(event) {
  if (event.key === 'Escape') {
    closePopup();
  }
}

function isRelevantSettingsTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.matches(CUSTOM_API_URL_INPUT_SELECTOR) ||
    target.matches(CHAT_COMPLETION_SOURCE_SELECTOR) ||
    target.closest('#completion_prompt_manager') ||
    target.closest('#completion_prompt_manager_popup'),
  );
}

function onDocumentSettingChange(event) {
  if (isRelevantSettingsTarget(event.target)) {
    scheduleHintVisibilityRefresh(120);
  }
}

/**
 * @returns {void}
 */
export function mountBaseUrlHint() {
  scheduleHintVisibilityRefresh(0);

  if (!observer) {
    observer = new MutationObserver(() => scheduleHintVisibilityRefresh(120));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('keydown', onDocumentKeyDown);
  document.addEventListener('input', onDocumentSettingChange, true);
  document.addEventListener('change', onDocumentSettingChange, true);
  document.addEventListener('click', onDocumentSettingChange, true);
  window.addEventListener('scroll', closePopup, true);
  window.addEventListener('resize', closePopup);
}

/**
 * @returns {void}
 */
export function unmountBaseUrlHint() {
  observer?.disconnect();
  observer = null;
  refreshSequence += 1;

  document.removeEventListener('keydown', onDocumentKeyDown);
  document.removeEventListener('input', onDocumentSettingChange, true);
  document.removeEventListener('change', onDocumentSettingChange, true);
  document.removeEventListener('click', onDocumentSettingChange, true);
  window.removeEventListener('scroll', closePopup, true);
  window.removeEventListener('resize', closePopup);

  removeHintTrigger();
  clearCloseTimer();
  clearOpenFrame();
  clearRefreshTimer();
}
