import { sleep } from '@neruz/core';

const ZOOM_SETTLE_MS = 700;

export const applyStudioTabZoom = async (zoom: number): Promise<() => Promise<void>> => {
  const tab = await chrome.tabs.getCurrent();
  if (!tab?.id) return async () => undefined;
  const tabId = tab.id;
  const [previousZoom, previousSettings] = await Promise.all([
    chrome.tabs.getZoom(tabId),
    chrome.tabs.getZoomSettings(tabId),
  ]);
  await chrome.tabs.setZoomSettings(tabId, { mode: 'automatic', scope: 'per-tab' });
  await chrome.tabs.setZoom(tabId, zoom);
  await sleep(ZOOM_SETTLE_MS);
  return async () => {
    await chrome.tabs.setZoomSettings(tabId, {
      mode: previousSettings.mode,
      scope: previousSettings.scope,
    });
    await chrome.tabs.setZoom(tabId, previousZoom);
  };
};
