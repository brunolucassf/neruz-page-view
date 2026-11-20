import { isExtensionPageSender, STUDIO_PORT_NAME } from '@neruz/core';
import { defineBackground } from 'wxt/utils/define-background';
import { forgetStudioOrigin, handleActionClick } from './action-click';
import { getExtensionIdentity, isRoutableType, routeMessage } from './message-router';
import {
  disableStudioTab,
  isStudioTab,
  reconcileWithLiveTabs,
  syncAgentScripts,
} from './studio-lifecycle';
import { attachStudioPort, detachStudioPort } from './studio-ports';

const STUDIO_PAGE_PATH = 'studio.html';

const handleStudioPort = (port: chrome.runtime.Port) => {
  const sender = port.sender;
  const tabId = sender?.tab?.id;
  const isAllowed =
    port.name === STUDIO_PORT_NAME &&
    tabId !== undefined &&
    isExtensionPageSender(sender ?? {}, getExtensionIdentity(), STUDIO_PAGE_PATH);
  if (!isAllowed || tabId === undefined) {
    port.disconnect();
    return;
  }
  attachStudioPort(tabId, port);
  port.onDisconnect.addListener(() => {
    if (detachStudioPort(tabId, port)) void disableStudioTab(tabId).catch(() => undefined);
  });
};

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
    const type = (raw as { type?: unknown } | null)?.type;
    if (typeof type !== 'string' || !isRoutableType(type)) return false;
    void routeMessage(raw, sender).then(sendResponse);
    return true;
  });

  chrome.runtime.onConnect.addListener(handleStudioPort);

  chrome.action.onClicked.addListener(handleActionClick);

  chrome.tabs.onRemoved.addListener((tabId) => {
    void forgetStudioOrigin(tabId).catch(() => undefined);
    void isStudioTab(tabId)
      .then((isStudio) => (isStudio ? disableStudioTab(tabId) : undefined))
      .catch(() => undefined);
  });

  chrome.permissions.onAdded.addListener(() => void syncAgentScripts().catch(() => undefined));
  chrome.permissions.onRemoved.addListener(() => void syncAgentScripts().catch(() => undefined));
  chrome.runtime.onStartup.addListener(() => void reconcileWithLiveTabs().catch(() => undefined));

  void reconcileWithLiveTabs().catch(() => undefined);
});
