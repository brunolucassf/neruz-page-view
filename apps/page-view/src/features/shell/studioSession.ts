import {
  createScrollMirror,
  getStudioClient,
  NpvException,
  parseWebUrl,
  type ScreenId,
  type StudioLaunch,
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
  if (!url) return false;
  const access = (await hasOriginAccess(url)) ? 'granted' : 'missing';
  useStudio.getState().showPage(url.href, access);
  return true;
}

export async function applyLaunch(launch: StudioLaunch, isReuse: boolean): Promise<void> {
  const previousUrl = useStudio.getState().pageUrl;
  const url = launch.url && !launch.url.startsWith('file:') ? normalizeAddress(launch.url) : null;
  if (!url) {
    const isFile = launch.url?.startsWith('file:') || launch.notice === 'file-access';
    if (isReuse && !launch.notice && !isFile) return;
    useStudio.getState().showEmpty(isFile ? 'file-access' : (launch.notice ?? 'none'));
    return;
  }
  const hasAccess = await hasOriginAccess(url);
  const access = hasAccess ? 'granted' : launch.permission === 'denied' ? 'denied' : 'missing';
  if (isReuse && previousUrl === url.href && hasAccess) return;
  useStudio.getState().showPage(url.href, access);
  if (isReuse && previousUrl && previousUrl !== url.href) {
    showToast({
      tone: 'neutral',
      title: t('entry.siteSwitched', { domain: url.hostname }),
      actions: [{ label: t('state.undo'), onPress: () => void openPage(previousUrl) }],
    });
  }
}

export async function runInitialLaunch(): Promise<void> {
  const launch = await getStudioClient()
    .requestLaunch()
    .catch(() => null);
  if (launch) await applyLaunch(launch, false);
}

export function openExtensionsPage(): void {
  const isFirefox = navigator.userAgent.includes('Firefox');
  void chrome.tabs.create({ url: isFirefox ? 'about:addons' : 'chrome://extensions' });
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
  if (!pageUrl || useStudio.getState().screens.find((screen) => screen.id === screenId)?.isFrozen)
    return;
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
  const stopListening = client.onEvent((event) => {
    if (event.type === 'ui.openUrl') void applyLaunch(event.payload, true);
    if (event.type === 'ui.actionClicked')
      document.querySelector<HTMLElement>('.capture-panel__footer button')?.focus();
  });
  return () => {
    stopListening();
    window.removeEventListener('pagehide', handlePageHide);
    mirror.stop();
  };
}

export function removeScreenWithUndo(screenId: ScreenId): void {
  useStudio.getState().removeScreen(screenId);
  showToast({
    tone: 'neutral',
    title: t('studio.screen.removed'),
    actions: [{ label: t('state.undo'), onPress: () => useStudio.getState().undo() }],
  });
}
