import { parseWebUrl } from '@neruz/core';

const LOCAL_HOST_PATTERN =
  /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|\d+\.\d+\.\d+\.\d+)(:\d+)?(\/|$)/i;

export function normalizeAddress(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed);
  const withScheme = hasScheme
    ? trimmed
    : `${LOCAL_HOST_PATTERN.test(trimmed) ? 'http' : 'https'}://${trimmed}`;
  const checked = parseWebUrl(withScheme);
  if (!checked.ok) return null;
  const { hostname } = checked.url;
  const isReachableHost =
    hostname === 'localhost' || hostname.includes('.') || hostname.startsWith('[');
  return isReachableHost ? checked.url : null;
}

export const isLocalAddress = (url: URL) => LOCAL_HOST_PATTERN.test(url.host);
