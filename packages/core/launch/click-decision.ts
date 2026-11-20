import type { StudioLaunch, StudioNotice } from '../messaging/background';
import { toOriginPermissionPattern } from '../security/sender';

const MAX_LAUNCH_URL_LENGTH = 2048;

const STORE_HOST_PATHS: readonly { host: string; pathPrefix: string }[] = [
  { host: 'chromewebstore.google.com', pathPrefix: '/' },
  { host: 'chrome.google.com', pathPrefix: '/webstore' },
  { host: 'microsoftedge.microsoft.com', pathPrefix: '/addons' },
  { host: 'addons.mozilla.org', pathPrefix: '/' },
];

export type ClickedTabInput = {
  url: string | undefined;
  studioPageUrl: string;
  isFileAccessAllowed: boolean;
};

export type ClickClassification =
  | { kind: 'studio' }
  | { kind: 'web'; url: string; originPattern: string }
  | { kind: 'unsupported'; notice: StudioNotice }
  | { kind: 'unknown' };

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isStoreUrl = (url: URL) =>
  STORE_HOST_PATHS.some(
    (store) => url.hostname === store.host && url.pathname.startsWith(store.pathPrefix),
  );

export const classifyClickedTab = ({
  url,
  studioPageUrl,
  isFileAccessAllowed,
}: ClickedTabInput): ClickClassification => {
  if (!url) return { kind: 'unknown' };
  const parsed = parseUrl(url);
  if (!parsed) return { kind: 'unsupported', notice: 'browser-page' };
  const studioUrl = parseUrl(studioPageUrl);
  if (
    studioUrl &&
    parsed.protocol === studioUrl.protocol &&
    parsed.host === studioUrl.host &&
    parsed.pathname === studioUrl.pathname
  ) {
    return { kind: 'studio' };
  }
  if (parsed.protocol === 'file:') {
    return isFileAccessAllowed && url.length <= MAX_LAUNCH_URL_LENGTH
      ? { kind: 'web', url, originPattern: toOriginPermissionPattern(parsed) }
      : { kind: 'unsupported', notice: 'file-access' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { kind: 'unsupported', notice: 'browser-page' };
  }
  if (isStoreUrl(parsed)) return { kind: 'unsupported', notice: 'store-page' };
  if (url.length > MAX_LAUNCH_URL_LENGTH) return { kind: 'unsupported', notice: 'browser-page' };
  return { kind: 'web', url, originPattern: toOriginPermissionPattern(parsed) };
};

export type ClickAction = { type: 'notify-studio' } | { type: 'launch'; launch: StudioLaunch };

export const decideClickAction = (
  classification: ClickClassification,
  isKnownStudioTab: boolean,
  isPermissionGranted: boolean,
): ClickAction => {
  if (classification.kind === 'studio' || (classification.kind === 'unknown' && isKnownStudioTab)) {
    return { type: 'notify-studio' };
  }
  if (classification.kind === 'web') {
    return {
      type: 'launch',
      launch: {
        url: classification.url,
        notice: null,
        permission: isPermissionGranted ? 'granted' : 'denied',
      },
    };
  }
  return {
    type: 'launch',
    launch: {
      url: null,
      notice: classification.kind === 'unsupported' ? classification.notice : 'browser-page',
      permission: 'not-requested',
    },
  };
};
