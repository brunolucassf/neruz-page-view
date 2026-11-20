const portsByTab = new Map<number, chrome.runtime.Port>();

export const attachStudioPort = (tabId: number, port: chrome.runtime.Port) => {
  portsByTab.set(tabId, port);
};

export const detachStudioPort = (tabId: number, port: chrome.runtime.Port): boolean => {
  if (portsByTab.get(tabId) !== port) return false;
  portsByTab.delete(tabId);
  return true;
};

export const forwardToStudio = (tabId: number, message: unknown) => {
  try {
    portsByTab.get(tabId)?.postMessage(message);
  } catch {
    portsByTab.delete(tabId);
  }
};
