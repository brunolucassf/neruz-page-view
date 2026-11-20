import type { ScreenId } from '../types';

export type SenderLike = {
  id?: string;
  url?: string;
  origin?: string;
  frameId?: number;
  tab?: { id?: number };
};

export type ExtensionPage = 'studio.html' | 'popup.html';

export type ExtensionIdentity = {
  runtimeId: string;
  baseUrl: string;
};

const parseUrl = (value: string | undefined): URL | null => {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export const isExtensionPageSender = (
  sender: SenderLike,
  identity: ExtensionIdentity,
  page: ExtensionPage,
): boolean => {
  if (sender.id !== identity.runtimeId) return false;
  if (sender.frameId !== undefined && sender.frameId !== 0) return false;
  const url = parseUrl(sender.url);
  const base = parseUrl(identity.baseUrl);
  if (!url || !base) return false;
  return (
    url.protocol === base.protocol &&
    url.host === base.host &&
    url.pathname === `${base.pathname.replace(/\/$/, '')}/${page}`
  );
};

export const isFrameAgentSender = (sender: SenderLike, identity: ExtensionIdentity): boolean =>
  sender.id === identity.runtimeId &&
  typeof sender.frameId === 'number' &&
  sender.frameId > 0 &&
  typeof sender.tab?.id === 'number';

export const resolveSenderOrigin = (sender: SenderLike): string | null => {
  if (sender.origin && sender.origin !== 'null') return sender.origin;
  return parseUrl(sender.url)?.origin ?? null;
};

export type WebUrlCheck = { ok: true; url: URL } | { ok: false };

export const parseWebUrl = (raw: string): WebUrlCheck => {
  const url = parseUrl(raw);
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) return { ok: false };
  return { ok: true, url };
};

export const toOriginPermissionPattern = (url: URL): string => `${url.protocol}//${url.hostname}/*`;

const SCREEN_NAME_PATTERN = /^npv:(s(?:[1-9]|1[0-6]))\.([a-z0-9-]{1,56})$/;

export const parseScreenName = (name: string): { screenId: ScreenId; presetId: string } | null => {
  const match = SCREEN_NAME_PATTERN.exec(name);
  if (!match?.[1] || !match[2]) return null;
  return { screenId: match[1] as ScreenId, presetId: match[2] };
};

export const buildScreenName = (screenId: ScreenId, presetId: string): string =>
  `npv:${screenId}.${presetId}`;
