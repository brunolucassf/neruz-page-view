import { browser } from 'wxt/browser';
import { loadSettings } from '../storage/items';
import {
  type AnalyticsPage,
  type AnalyticsParams,
  buildCollectUrl,
  buildPageParams,
  buildPayload,
  canSendAnalytics,
  isValidEventName,
  SESSION_TIMEOUT_MS,
} from './analyticsPayload';

const CLIENT_ID_KEY = 'analyticsClientId';
const SESSION_KEY = 'analyticsSession';
const FIREFOX_DATA_PERMISSION = { data_collection: ['technicalAndInteraction'] };

type StoredSession = { id: string; touchedAt: number };
type PermissionsApi = {
  contains: (request: unknown) => Promise<boolean>;
  request: (request: unknown) => Promise<boolean>;
  remove: (request: unknown) => Promise<boolean>;
};

export const isFirefoxBuild = () => import.meta.env.BROWSER === 'firefox';
const readSecret = (): string => import.meta.env.WXT_GA_API_SECRET ?? '';
const permissionsApi = () => browser.permissions as unknown as PermissionsApi;

export async function hasFirefoxDataPermission(): Promise<boolean> {
  try {
    return await permissionsApi().contains(FIREFOX_DATA_PERMISSION);
  } catch {
    return false;
  }
}

export async function setFirefoxDataPermission(isOn: boolean): Promise<boolean> {
  try {
    const api = permissionsApi();
    if (isOn) return await api.request(FIREFOX_DATA_PERMISSION);
    await api.remove(FIREFOX_DATA_PERMISSION);
    return false;
  } catch {
    return false;
  }
}

async function shouldSend(): Promise<boolean> {
  const hasSecret = readSecret() !== '';
  if (!hasSecret) return false;
  const { analytics } = await loadSettings();
  const isFirefox = isFirefoxBuild();
  return canSendAnalytics({
    hasSecret,
    isSettingOn: analytics,
    isFirefox,
    hasFirefoxPermission: isFirefox ? await hasFirefoxDataPermission() : false,
  });
}

async function readClientId(): Promise<string> {
  const stored = await browser.storage.local.get(CLIENT_ID_KEY);
  const existing = stored[CLIENT_ID_KEY];
  if (typeof existing === 'string' && existing !== '') return existing;
  const created = crypto.randomUUID();
  await browser.storage.local.set({ [CLIENT_ID_KEY]: created });
  return created;
}

async function readSessionId(): Promise<string> {
  const now = Date.now();
  const stored = await browser.storage.session.get(SESSION_KEY);
  const current = stored[SESSION_KEY] as StoredSession | undefined;
  const isFresh = current !== undefined && now - current.touchedAt < SESSION_TIMEOUT_MS;
  const session: StoredSession = { id: isFresh ? current.id : String(now), touchedAt: now };
  await browser.storage.session.set({ [SESSION_KEY]: session });
  return session.id;
}

export async function track(name: string, params?: AnalyticsParams): Promise<void> {
  try {
    if (!isValidEventName(name) || !(await shouldSend())) return;
    const body = buildPayload({
      clientId: await readClientId(),
      sessionId: await readSessionId(),
      version: browser.runtime.getManifest().version,
      name,
      params,
    });
    await fetch(buildCollectUrl(readSecret()), {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      body: JSON.stringify(body),
    });
  } catch {}
}

export const trackPageView = (page: AnalyticsPage) => track('page_view', buildPageParams(page));
