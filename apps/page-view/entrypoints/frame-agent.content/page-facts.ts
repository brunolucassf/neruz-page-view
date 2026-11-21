import { MAX_COLLECTED_LINKS, MAX_PAGE_URL_LENGTH } from '@neruz/core';

const MAX_LINK_TEXT_LENGTH = 120;
const MAX_TITLE_LENGTH = 200;

type CollectedLink = { url: string; text: string | null };

const collapseSpaces = (text: string): string => text.replace(/\s+/g, ' ').trim();

const readLinkText = (anchor: HTMLAnchorElement | HTMLAreaElement): string | null => {
  const text = collapseSpaces(anchor.getAttribute('aria-label') || anchor.textContent || '');
  return text ? text.slice(0, MAX_LINK_TEXT_LENGTH) : null;
};

const readInternalUrl = (anchor: HTMLAnchorElement | HTMLAreaElement): string | null => {
  if (anchor.hasAttribute('download')) return null;
  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return null;
  }
  const isWebUrl = url.protocol === 'http:' || url.protocol === 'https:';
  if (!isWebUrl || url.origin !== location.origin) return null;
  url.hash = '';
  return url.href.length > MAX_PAGE_URL_LENGTH ? null : url.href;
};

export const collectLinks = ({ max = MAX_COLLECTED_LINKS }: { max?: number }) => {
  const seen = new Set<string>();
  const links: CollectedLink[] = [];
  let total = 0;
  for (const anchor of Array.from(document.links)) {
    const url = readInternalUrl(anchor);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    total += 1;
    if (links.length < max) links.push({ url, text: readLinkText(anchor) });
  }
  return { links, total, truncated: total > max };
};

const readHttpStatus = (): number | null => {
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  const status = entry?.responseStatus;
  return typeof status === 'number' && status > 0 ? status : null;
};

const hasVisiblePasswordField = (): boolean =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[type=password]')).some(
    (input) => input.getClientRects().length > 0 && getComputedStyle(input).visibility !== 'hidden',
  );

export const readPageFacts = () => ({
  url: location.href.slice(0, MAX_PAGE_URL_LENGTH),
  title: collapseSpaces(document.title).slice(0, MAX_TITLE_LENGTH),
  httpStatus: readHttpStatus(),
  hasPasswordField: hasVisiblePasswordField(),
});
