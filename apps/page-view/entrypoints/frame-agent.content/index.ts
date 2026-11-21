import { frameBye, frameHello, frameReady, frameStable, parseScreenName } from '@neruz/core';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createCommandRunner, isStudioCommand } from './commands';
import { sendFrameEvent, sendFrameRequest } from './frame-events';
import { startScrollMirroring } from './mirroring';
import { showThinScrollbar } from './page-overrides';
import { waitStable } from './stability';

const readClaimedIdentity = () => {
  if (window === window.top || window.parent !== window.top) return null;
  return parseScreenName(window.name);
};

const announceLifecycle = () => {
  const announceReady = () => {
    sendFrameEvent(frameReady, {
      url: location.href.slice(0, 4096),
      title: document.title.slice(0, 500),
      scrollHeight: document.documentElement.scrollHeight,
    });
    void waitStable().then(({ timedOut }) =>
      sendFrameEvent(frameStable, { sinceLoadMs: Math.round(performance.now()), timedOut }),
    );
  };
  if (document.readyState === 'complete') announceReady();
  else window.addEventListener('load', announceReady, { once: true });
  window.addEventListener('pagehide', () => sendFrameEvent(frameBye, {}), { once: true });
};

const startFrameAgent = async () => {
  const identity = readClaimedIdentity();
  if (!identity) return;
  const hello = await sendFrameRequest(frameHello, {
    ...identity,
    origin: location.origin,
    url: location.href.slice(0, 4096),
  }).catch(() => null);
  if (!hello?.accepted) return;

  showThinScrollbar();
  const mirroring = startScrollMirroring();
  const runCommand = createCommandRunner({
    identity: { runtimeId: chrome.runtime.id, baseUrl: chrome.runtime.getURL('/') },
    onScrollApplied: mirroring.lockEcho,
  });
  chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
    if (!isStudioCommand(raw)) return false;
    void runCommand(raw, sender).then(sendResponse);
    return true;
  });
  announceLifecycle();
};

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  runAt: 'document_start',
  allFrames: true,
  matchOriginAsFallback: true,
  main() {
    void startFrameAgent();
  },
});
