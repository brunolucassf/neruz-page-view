import {
  createScrollMirror,
  getStudioClient,
  NpvException,
  parseWebUrl,
  type ScreenId,
  toOriginPermissionPattern,
} from '@neruz/core';
import { t } from '../i18n';
import { showToast } from '../toasts/toastStore';
import { normalizeAddress } from './address';
import { useStudio } from './studioStore';

const hasOriginAccess = (url: URL) =>
  chrome.permissions.contains({ origins: [toOriginPermissionPattern(url)] });

export async function openPage(raw: string): Promise<boolean> {
  const url = normalizeAddress(raw);
  if (!url) {
    showToast({ tone: 'error', title: t('state.error.invalidUrl') });
    return false;
  }
  const access = (await hasOriginAccess(url)) ? 'granted' : 'missing';
  useStudio.getState().showPage(url.href, access);
  return true;
}

export async function allowPageOrigin(): Promise<void> {
  const { pageUrl, setAccess } = useStudio.getState();
  if (!pageUrl) return;
  const domain = new URL(pageUrl).hostname;
  setAccess('requesting');
  try {
    await getStudioClient().requestOriginPermission(pageUrl);
    setAccess('granted');
    showToast({ tone: 'neutral', title: t('perm.site.granted', { domain }) });
  } catch {
    setAccess('denied');
  }
}

export function declinePageOrigin(): void {
  useStudio.getState().setAccess('denied');
}

export async function loadScreen(
  iframe: HTMLIFrameElement,
  screenId: ScreenId,
  presetId: string,
  signal: AbortSignal,
): Promise<void> {
  const { pageUrl, setScreenStatus, setAccess } = useStudio.getState();
  if (!pageUrl) return;
  setScreenStatus(screenId, 'loading');
  try {
    await getStudioClient().openScreen({ iframe, screenId, presetId, url: pageUrl, signal });
    if (!signal.aborted) setScreenStatus(screenId, 'ready');
  } catch (cause) {
    if (signal.aborted) return;
    if (cause instanceof NpvException && cause.error.code === 'NPV-PERMISSION-MISSING') {
      setAccess('missing');
      return;
    }
    setScreenStatus(screenId, 'blocked');
  }
}

export async function findCurrentTabAddress(): Promise<string | null> {
  const [ownTab, tabs] = await Promise.all([
    chrome.tabs.getCurrent(),
    chrome.tabs.query({ currentWindow: true }),
  ]);
  const candidates = tabs
    .filter((tab) => tab.id !== ownTab?.id && tab.url && parseWebUrl(tab.url).ok)
    .sort((first, second) => (second.lastAccessed ?? 0) - (first.lastAccessed ?? 0));
  return candidates[0]?.url ?? null;
}

export function startStudioSession(): () => void {
  const client = getStudioClient();
  const mirror = createScrollMirror(client, { isEnabled: () => useStudio.getState().isMirrorOn });
  const handlePageHide = () => {
    mirror.stop();
    void client.disable().catch(() => undefined);
    client.close();
  };
  window.addEventListener('pagehide', handlePageHide, { once: true });
  return () => {
    window.removeEventListener('pagehide', handlePageHide);
    mirror.stop();
  };
}
