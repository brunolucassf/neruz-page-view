import {
  classifyClickedTab,
  createEnvelope,
  createSeqCounter,
  decideClickAction,
  EMPTY_STUDIO_LAUNCH,
  type StudioLaunch,
  uiActionClicked,
  uiOpenUrl,
} from '@neruz/core';
import { handleRecordingClick } from './recording';
import {
  readStudioOrigins,
  storeStudioLaunch,
  takeStudioLaunch,
  writeStudioOrigins,
} from './session-state';
import { isStudioTab, isTabAlive, runSerial } from './studio-lifecycle';
import { forwardToStudio, hasStudioPort } from './studio-ports';

const STUDIO_PAGE_PATH = 'studio.html';

const nextEventSeq = createSeqCounter();
const tabsAwaitingPermission = new Set<number>();

const requestOriginPermission = (originPattern: string): Promise<boolean> => {
  try {
    return chrome.permissions.request({ origins: [originPattern] }).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
};

const deliverLaunch = async (studioTabId: number, launch: StudioLaunch) => {
  if (hasStudioPort(studioTabId)) {
    forwardToStudio(studioTabId, createEnvelope(uiOpenUrl, launch, nextEventSeq()));
    return;
  }
  await storeStudioLaunch(studioTabId, launch);
};

const findLiveStudioOf = async (originTabId: number) => {
  const origin = (await readStudioOrigins()).find((entry) => entry.originTabId === originTabId);
  if (!origin || !(await isTabAlive(origin.studioTabId))) return null;
  return origin.studioTabId;
};

const focusTab = async (tabId: number) => {
  const tab = await chrome.tabs.update(tabId, { active: true });
  if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
};

const createStudioTab = async (origin: chrome.tabs.Tab): Promise<number | null> => {
  const created = await chrome.tabs.create({
    url: chrome.runtime.getURL(`/${STUDIO_PAGE_PATH}`),
    index: origin.index + 1,
    windowId: origin.windowId,
  });
  return created.id ?? null;
};

const openOrFocusStudio = (origin: chrome.tabs.Tab, originTabId: number, launch: StudioLaunch) =>
  runSerial(async () => {
    const existing = await findLiveStudioOf(originTabId);
    if (existing !== null) {
      await focusTab(existing);
      await deliverLaunch(existing, launch);
      return;
    }
    const studioTabId = await createStudioTab(origin);
    if (studioTabId === null) return;
    await storeStudioLaunch(studioTabId, launch);
    const origins = await readStudioOrigins();
    await writeStudioOrigins([...origins, { studioTabId, originTabId }]);
  });

export const consumeStudioLaunch = (studioTabId: number): Promise<StudioLaunch> =>
  runSerial(async () => (await takeStudioLaunch(studioTabId)) ?? EMPTY_STUDIO_LAUNCH);

export const forgetStudioOrigin = (closedTabId: number) =>
  runSerial(async () => {
    const origins = await readStudioOrigins();
    const next = origins
      .filter((entry) => entry.studioTabId !== closedTabId)
      .map((entry) =>
        entry.originTabId === closedTabId ? { ...entry, originTabId: null } : entry,
      );
    await writeStudioOrigins(next);
    await takeStudioLaunch(closedTabId);
  });

const handleClick = async (tab: chrome.tabs.Tab, permission: Promise<boolean> | null) => {
  const classification = classifyClickedTab({
    url: tab.url,
    studioPageUrl: chrome.runtime.getURL(`/${STUDIO_PAGE_PATH}`),
    isFileAccessAllowed: await chrome.extension.isAllowedFileSchemeAccess(),
  });
  const tabId = tab.id;
  const isKnownStudio = tabId !== undefined && (await isStudioTab(tabId));
  const isPermissionGranted = permission ? await permission : classification.kind === 'web';
  const action = decideClickAction(classification, isKnownStudio, isPermissionGranted);
  if (action.type === 'notify-studio') {
    if (tabId === undefined) return;
    const outcome = await handleRecordingClick(tabId);
    if (outcome.isConsumed) return;
    forwardToStudio(
      tabId,
      createEnvelope(uiActionClicked, { recording: outcome.recording }, nextEventSeq()),
    );
    return;
  }
  if (tabId === undefined) return;
  await openOrFocusStudio(tab, tabId, action.launch);
};

export const handleActionClick = (tab: chrome.tabs.Tab) => {
  const tabId = tab.id;
  if (tabId !== undefined && tabsAwaitingPermission.has(tabId)) return;
  const quickClassification = classifyClickedTab({
    url: tab.url,
    studioPageUrl: chrome.runtime.getURL(`/${STUDIO_PAGE_PATH}`),
    isFileAccessAllowed: true,
  });
  const permission =
    quickClassification.kind === 'web' && !quickClassification.url.startsWith('file:')
      ? requestOriginPermission(quickClassification.originPattern)
      : null;
  if (tabId !== undefined) tabsAwaitingPermission.add(tabId);
  void handleClick(tab, permission)
    .catch(() => undefined)
    .finally(() => {
      if (tabId !== undefined) tabsAwaitingPermission.delete(tabId);
    });
};
