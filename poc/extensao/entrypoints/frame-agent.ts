import { SCREEN_NAME_PATTERN, type FrameCommand, type ScrollAnchor } from '../lib/shared';

const TRUSTED_INPUT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
const INPUT_ACTIVE_WINDOW_MS = 1500;
const ECHO_LOCK_MS = 150;
const ANCHOR_CANDIDATES = 'main > *, body > section, section, article, footer';
const STABLE_DOM_QUIET_MS = 300;
const STABLE_NETWORK_QUIET_MS = 500;
const STABLE_STEP_CAP_MS = 4000;
const IMAGE_DECODE_CAP_MS = 1500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const maxScrollTop = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

function buildSelector(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body && parts.length < 5) {
    const tag = current.tagName.toLowerCase();
    const sameTag = current.parentElement ? [...current.parentElement.children].filter((child) => child.tagName === current!.tagName) : [];
    parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(current) + 1})` : tag);
    current = current.parentElement;
  }
  return `body > ${parts.join(' > ')}`;
}

function isOutOfFlow(element: Element) {
  const position = getComputedStyle(element).position;
  return position === 'fixed' || position === 'sticky';
}

function findAnchorElement(): { element: Element; top: number; height: number } | null {
  const minHeight = window.innerHeight * 0.4;
  let found: { element: Element; top: number; height: number } | null = null;
  for (const element of document.querySelectorAll(ANCHOR_CANDIDATES)) {
    if (isOutOfFlow(element)) continue;
    const rect = element.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    if (rect.height < minHeight || top > window.scrollY + 1) continue;
    if (!found || top >= found.top) found = { element, top, height: rect.height };
  }
  return found;
}

function readAnchor(screen: string): ScrollAnchor {
  const anchor = findAnchorElement();
  const max = maxScrollTop();
  const pageRatio = max > 0 ? window.scrollY / max : 0;
  if (!anchor) return { selector: null, offsetRatio: 0, pageRatio, sourceScreen: screen };
  return {
    selector: buildSelector(anchor.element),
    offsetRatio: (window.scrollY - anchor.top) / anchor.height,
    pageRatio,
    sourceScreen: screen,
  };
}

function applyAnchor(anchor: ScrollAnchor) {
  let top = anchor.pageRatio * maxScrollTop();
  const element = anchor.selector ? document.querySelector(anchor.selector) : null;
  if (element) {
    const rect = element.getBoundingClientRect();
    top = rect.top + window.scrollY + anchor.offsetRatio * rect.height;
  }
  window.scrollTo({ top, behavior: 'instant' });
}

function visibleImages() {
  const vh = window.innerHeight;
  return [...document.images].filter((image) => {
    const rect = image.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < vh;
  });
}

function areAnimationsSettled() {
  return document.getAnimations().every((animation) => {
    if (animation.playState === 'finished' || animation.playState === 'idle') return true;
    return animation.effect?.getComputedTiming().iterations === Infinity;
  });
}

async function waitStable() {
  let lastDomChange = performance.now();
  let lastNetwork = performance.now();
  const mutations = new MutationObserver(() => (lastDomChange = performance.now()));
  mutations.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  const network = new PerformanceObserver(() => (lastNetwork = performance.now()));
  network.observe({ type: 'resource', buffered: false });
  const startedAt = performance.now();
  let timedOut = false;
  while (true) {
    await sleep(50);
    const now = performance.now();
    const imagesReady = visibleImages().every((image) => image.complete);
    const isStable =
      now - lastDomChange >= STABLE_DOM_QUIET_MS &&
      now - lastNetwork >= STABLE_NETWORK_QUIET_MS &&
      areAnimationsSettled() &&
      imagesReady;
    if (isStable) break;
    if (now - startedAt > STABLE_STEP_CAP_MS) {
      timedOut = true;
      break;
    }
  }
  mutations.disconnect();
  network.disconnect();
  await Promise.all(visibleImages().map((image) => Promise.race([image.decode().catch(() => undefined), sleep(IMAGE_DECODE_CAP_MS)])));
  return { waitedMs: Math.round(performance.now() - startedAt), timedOut };
}

async function warmup() {
  const startedAt = performance.now();
  const step = window.innerHeight / 2;
  let steps = 0;
  let timeouts = 0;
  for (let top = 0; top <= maxScrollTop() + step; top += step) {
    window.scrollTo({ top: Math.min(top, maxScrollTop()), behavior: 'instant' });
    const result = await waitStable();
    steps += 1;
    if (result.timedOut) timeouts += 1;
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await waitStable();
  return { steps, timeouts, durationMs: Math.round(performance.now() - startedAt), scrollHeight: document.documentElement.scrollHeight };
}

const hiddenElements = new Map<HTMLElement, string>();

function setFixedHidden(hidden: boolean) {
  if (hidden) {
    for (const element of document.querySelectorAll<HTMLElement>('*')) {
      if (!isOutOfFlow(element) || hiddenElements.has(element)) continue;
      hiddenElements.set(element, element.style.getPropertyValue('visibility'));
      element.style.setProperty('visibility', 'hidden', 'important');
    }
    return hiddenElements.size;
  }
  for (const [element, previous] of hiddenElements) {
    if (previous) element.style.setProperty('visibility', previous);
    else element.style.removeProperty('visibility');
  }
  hiddenElements.clear();
  return 0;
}

let scrollbarStyle: HTMLStyleElement | null = null;

function setScrollbarHidden(hidden: boolean) {
  scrollbarStyle?.remove();
  scrollbarStyle = null;
  if (!hidden) return;
  scrollbarStyle = document.createElement('style');
  scrollbarStyle.textContent = 'html{scrollbar-width:none!important}html::-webkit-scrollbar{display:none!important}';
  document.documentElement.append(scrollbarStyle);
}

async function autoscroll(durationMs: number) {
  window.scrollTo({ top: 0, behavior: 'instant' });
  await sleep(300);
  const total = maxScrollTop();
  const startedAt = performance.now();
  while (true) {
    const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
    const eased = 0.5 - Math.cos(Math.PI * progress) / 2;
    window.scrollTo({ top: total * eased, behavior: 'instant' });
    if (progress >= 1) break;
    await nextFrame();
  }
  return { total };
}

async function runCommand(command: FrameCommand) {
  if (command.type === 'ping') return { ok: true };
  if (command.type === 'metrics') {
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio,
      scrollY: window.scrollY,
    };
  }
  if (command.type === 'scrollTo') {
    window.scrollTo({ top: command.top, behavior: 'instant' });
    await nextFrame();
    return { scrollY: window.scrollY };
  }
  if (command.type === 'scroll.apply') {
    applyAnchor(command.anchor);
    return { ok: true };
  }
  if (command.type === 'warmup') return warmup();
  if (command.type === 'waitStable') return waitStable();
  if (command.type === 'hideFixed') return { hiddenCount: setFixedHidden(command.hidden) };
  if (command.type === 'hideScrollbar') {
    setScrollbarHidden(command.hidden);
    return { ok: true };
  }
  if (command.type === 'autoscroll') return autoscroll(command.durationMs);
  return { ok: false };
}

function startMirroring(screen: string) {
  let lastTrustedInputAt = -Infinity;
  let echoLockUntil = 0;
  let isScheduled = false;

  for (const eventName of TRUSTED_INPUT_EVENTS) {
    window.addEventListener(
      eventName,
      (event) => {
        if (event.isTrusted) lastTrustedInputAt = performance.now();
      },
      { passive: true, capture: true },
    );
  }

  window.addEventListener(
    'scroll',
    (event) => {
      const now = performance.now();
      if (!event.isTrusted || now < echoLockUntil || now - lastTrustedInputAt > INPUT_ACTIVE_WINDOW_MS) return;
      if (isScheduled) return;
      isScheduled = true;
      requestAnimationFrame(() => {
        isScheduled = false;
        chrome.runtime.sendMessage({ type: 'scroll', anchor: readAnchor(screen) }).catch(() => undefined);
      });
    },
    { passive: true },
  );

  chrome.runtime.onMessage.addListener((message: FrameCommand, sender, sendResponse) => {
    const isFromStudioOrBackground = sender.id === chrome.runtime.id && !!sender.url?.startsWith(`chrome-extension://${chrome.runtime.id}/`);
    if (!isFromStudioOrBackground) return false;
    if (message.type === 'scroll.apply') echoLockUntil = performance.now() + ECHO_LOCK_MS;
    runCommand(message).then(sendResponse, (error) => sendResponse({ ok: false, error: String(error?.message ?? error) }));
    return true;
  });
}

export default defineUnlistedScript(async () => {
  if (window === window.top || !SCREEN_NAME_PATTERN.test(window.name)) return;
  const screen = window.name.slice('npv:'.length);
  const reply = await chrome.runtime.sendMessage({ type: 'frame.hello', screen, origin: location.origin }).catch(() => null);
  if (reply?.ok) startMirroring(screen);
});
